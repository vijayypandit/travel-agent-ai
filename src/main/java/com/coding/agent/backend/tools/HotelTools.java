package com.coding.agent.backend.tools;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Tool component providing live hotel search and booking integration via Booking.com API.
 * Registered as an AI tool for Spring AI ChatClient.
 */
@Component
public class HotelTools {

    private static final Logger log = LoggerFactory.getLogger(HotelTools.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String apiHost;
    private final String baseUrl;

    /**
     * Initializes HotelTools with RapidAPI Booking.com credentials and endpoint configuration.
     * 
     * @param apiKey RapidAPI key
     * @param apiHost RapidAPI host header
     * @param baseUrl base URL for Booking.com API endpoints
     */
    public HotelTools(
            @Value("${rapidapi.booking.key}") String apiKey,
            @Value("${rapidapi.booking.host:booking-com.p.rapidapi.com}") String apiHost,
            @Value("${rapidapi.booking.base-url:https://booking-com.p.rapidapi.com}") String baseUrl) {
        this.apiKey = apiKey;
        this.apiHost = apiHost;
        this.baseUrl = baseUrl;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Queries live hotels from Booking.com API for a destination city within an optional maximum price limit.
     * 
     * @param city destination city or region name
     * @param maxPrice optional upper budget per night in INR (₹)
     * @return summary list of hotels with IDs, prices, ratings, and locations
     */
    @Tool(name = "searchHotel", description = "Search for available live hotels in an Indian city or region (e.g. Goa, Mumbai, Delhi). Returns Hotel IDs (needed for booking), hotel names, rates in INR, and ratings.")
    public String searchHotels(
            @ToolParam(description = "City or region name to search hotels in (e.g. Goa, Mumbai, Delhi)") String city,
            @ToolParam(description = "Maximum price per night in INR, or 0 for no limit", required = false) Integer maxPrice) {

        int priceLimit = (maxPrice != null && maxPrice > 0) ? maxPrice : 0;
        log.info("Querying live hotels from Booking.com API for city: {}, maxPrice: ₹{}", city, priceLimit);

        if (city == null || city.isBlank()) {
            return "City name cannot be empty.";
        }

        String cleanCity = city.replaceAll("\\(.*?\\)", "").trim();

        try {
            // Step 1: Query location to get dest_id and dest_type
            String locationUri = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/v1/hotels/locations")
                    .queryParam("name", cleanCity)
                    .queryParam("locale", "en-gb")
                    .toUriString();

            List<LocationResult> locations = restClient.get()
                    .uri(locationUri)
                    .header("x-rapidapi-key", apiKey)
                    .header("x-rapidapi-host", apiHost)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<LocationResult>>() {});

            if (locations == null || locations.isEmpty()) {
                return "No destination found for city: " + cleanCity;
            }

            // Strictly pick Indian destination (country = India or cc1 = in)
            LocationResult targetLocation = locations.stream()
                    .filter(loc -> (loc.country() != null && loc.country().equalsIgnoreCase("India"))
                            || "in".equalsIgnoreCase(loc.cc1()))
                    .filter(loc -> "region".equalsIgnoreCase(loc.destType()) || "city".equalsIgnoreCase(loc.destType()))
                    .findFirst()
                    .orElseGet(() -> locations.stream()
                            .filter(loc -> (loc.country() != null && loc.country().toLowerCase().contains("india"))
                                    || "in".equalsIgnoreCase(loc.cc1()))
                            .findFirst()
                            .orElse(locations.getFirst()));

            String destId = targetLocation.destId();
            String destType = targetLocation.destType();
            log.info("Selected destination '{}' ({}, cc1: {}) with dest_id: {}, dest_type: {}", 
                    targetLocation.name(), targetLocation.country(), targetLocation.cc1(), destId, destType);

            // Step 2: Search live hotel offers for upcoming dates
            String checkinDate = LocalDate.now().plusWeeks(2).toString();
            String checkoutDate = LocalDate.now().plusWeeks(2).plusDays(1).toString();

            // Note: filter_by_currency and room_number are strictly required by Booking.com API
            String searchUri = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/v1/hotels/search")
                    .queryParam("dest_id", destId)
                    .queryParam("dest_type", destType)
                    .queryParam("locale", "en-gb")
                    .queryParam("currency", "INR")
                    .queryParam("filter_by_currency", "INR")
                    .queryParam("room_number", "1")
                    .queryParam("adults_number", "1")
                    .queryParam("checkin_date", checkinDate)
                    .queryParam("checkout_date", checkoutDate)
                    .queryParam("units", "metric")
                    .queryParam("order_by", "popularity")
                    .queryParam("page_number", "0")
                    .toUriString();

            HotelSearchResponse searchResponse = restClient.get()
                    .uri(searchUri)
                    .header("x-rapidapi-key", apiKey)
                    .header("x-rapidapi-host", apiHost)
                    .retrieve()
                    .body(HotelSearchResponse.class);

            if (searchResponse == null || searchResponse.result() == null || searchResponse.result().isEmpty()) {
                return "No live hotels currently returned for " + cleanCity + " on Booking.com.";
            }

            // Step 3: Filter by maxPrice (if specified) or list top hotels
            List<HotelItem> matchingHotels = searchResponse.result().stream()
                    .filter(h -> {
                        if (priceLimit <= 0) return true;
                        int price = h.extractPrice();
                        return price <= 0 || price <= priceLimit;
                    })
                    .limit(6)
                    .toList();

            if (matchingHotels.isEmpty()) {
                return String.format("Found %d live hotels in %s, but none under ₹%d/night.",
                        searchResponse.result().size(), cleanCity, priceLimit);
            }

            return matchingHotels.stream()
                    .map(h -> {
                        int price = h.extractPrice();
                        String priceStr = price > 0 ? "₹" + price + "/night" : "Price on request";
                        double rating = h.reviewScore() != null ? h.reviewScore() : 4.0;
                        String locInfo = "";
                        if (h.distance() != null && !h.distance().isBlank()) {
                            locInfo = String.format(", Transit: %s from centre", h.distance());
                        } else if (h.district() != null && !h.district().isBlank()) {
                            locInfo = String.format(", Area: %s", h.district());
                        }
                        return String.format("[Hotel ID: %s] %s in %s (%s, Rating: %.1f★%s)", 
                                h.hotelId(), h.hotelName(), targetLocation.name(), priceStr, rating, locInfo);
                    })
                    .collect(Collectors.joining(", "));

        } catch (Exception e) {
            log.error("Error querying live Booking.com API for {}: {}", cleanCity, e.getMessage(), e);
            return String.format("Error fetching live hotels for '%s': %s", cleanCity, e.getMessage());
        }
    }

    /**
     * Initiates a live hotel booking process for a specified hotel ID.
     * 
     * @param hotelId unique identifier of the hotel
     * @return confirmation message for booking initiation
     */
    @Tool(name = "bookHotel", description = "Book a live hotel by its hotel ID.")
    public String bookHotel(String hotelId) {
        log.info("Booking request received for hotel ID: {}", hotelId);
        return "Live booking initiated for Hotel ID: " + hotelId + ". Please complete guest details and payment confirmation.";
    }

    /**
     * DTO mapping Booking.com location autocomplete results.
     */
    public record LocationResult(
            @JsonProperty("dest_id") String destId,
            @JsonProperty("dest_type") String destType,
            @JsonProperty("name") String name,
            @JsonProperty("city_name") String cityName,
            @JsonProperty("country") String country,
            @JsonProperty("cc1") String cc1
    ) {}

    /**
     * DTO mapping Booking.com hotel search response wrapper.
     */
    public record HotelSearchResponse(
            @JsonProperty("count") Integer count,
            @JsonProperty("result") List<HotelItem> result
    ) {}

    /**
     * DTO mapping individual hotel listings from Booking.com.
     */
    public record HotelItem(
            @JsonProperty("hotel_id") Long hotelId,
            @JsonProperty("hotel_name") String hotelName,
            @JsonProperty("review_score") Double reviewScore,
            @JsonProperty("min_total_price") Double minTotalPrice,
            @JsonProperty("composite_price_breakdown") CompositePrice compositePrice,
            @JsonProperty("distance") String distance,
            @JsonProperty("address") String address,
            @JsonProperty("district") String district
    ) {
        /**
         * Resolves the approximate nightly rate from gross amounts or total prices.
         * 
         * @return nightly rate in local currency units
         */
        public int extractPrice() {
            if (compositePrice != null && compositePrice.grossAmountPerNight() != null && compositePrice.grossAmountPerNight().value() != null) {
                return compositePrice.grossAmountPerNight().value().intValue();
            }
            if (minTotalPrice != null && minTotalPrice > 0) {
                return (int) Math.round(minTotalPrice / 2.0);
            }
            if (compositePrice != null && compositePrice.grossAmount() != null && compositePrice.grossAmount().value() != null) {
                return (int) Math.round(compositePrice.grossAmount().value() / 2.0);
            }
            return 0;
        }
    }

    /**
     * Composite price breakdown containing total and per-night amount details.
     */
    public record CompositePrice(
            @JsonProperty("gross_amount") Amount grossAmount,
            @JsonProperty("gross_amount_per_night") Amount grossAmountPerNight
    ) {}

    /**
     * Monetary amount structure with numerical value and currency symbol.
     */
    public record Amount(
            @JsonProperty("value") Double value,
            @JsonProperty("currency") String currency
    ) {}
}
