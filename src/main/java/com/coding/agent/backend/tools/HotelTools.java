package com.coding.agent.backend.tools;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import com.coding.agent.backend.model.Hotel;

@Component
public class HotelTools {

    private static final Logger log = LoggerFactory.getLogger(HotelTools.class);

    // Sample hotel data
    private final List<Hotel> hotels = List.of(
        new Hotel("H101", "The Grand Palace", "New York", 250, 4.8, true),
        new Hotel("H102", "Sunset Boulevard Resort", "New York", 180, 4.5, true),
        new Hotel("H103", "Taj Palace", "New Delhi", 150, 4.9, true),
        new Hotel("H104", "Eiffel Luxury Suites", "London", 320, 4.7, false),
        new Hotel("H105", "Marina Bay Sands View", "London", 300, 4.9, true)
    );

    // Search hotels tool
    @Tool(name = "searchHotel", description = "Search for available hotels in a specific city within a maximum budget per night.")
    public String searchHotels(String city, int maxPrice) {
        log.info("Inside searchHotels tool for city: {}, maxPrice: {}", city, maxPrice);
        StringBuilder result = new StringBuilder();

        String cleanCity = city.replaceAll("\\(.*?\\)", "").trim().toLowerCase();
        for (Hotel hotel : hotels) {
            String hotelCity = hotel.city().toLowerCase();
            if ((hotelCity.contains(cleanCity) || cleanCity.contains(hotelCity)) 
                    && hotel.pricePerNight() <= maxPrice 
                    && hotel.available()) {
                if (!result.isEmpty()) {
                    result.append(", ");
                }
                result.append(hotel.name())
                      .append(" (ID: ").append(hotel.id())
                      .append(", Price: $").append(hotel.pricePerNight()).append("/night")
                      .append(", Rating: ").append(hotel.rating()).append("★)");
            }
        }

        if (result.isEmpty()) {
            log.info("No hotels found in {} under budget ${}", city, maxPrice);
            return "No available hotels found in " + city + " within the price of $" + maxPrice + " per night.";
        }

        log.info("Hotels found: {}", result);
        return result.toString();
    }

    // Book hotel tool
    @Tool(name = "bookHotel", description = "Book a hotel by its hotel ID")
    public String bookHotel(String hotelId) {
        log.info("Inside bookHotel tool for hotelId: {}", hotelId);
        return hotels.stream()
                .filter(h -> h.id().equalsIgnoreCase(hotelId.trim()))
                .findFirst()
                .map(h -> h.available()
                        ? "Booking confirmed for " + h.name() + " in " + h.city() + " at $" + h.pricePerNight() + "/night."
                        : h.name() + " is currently fully booked.")
                .orElse("Hotel with ID " + hotelId + " not found.");
    }
}
