package com.coding.agent.backend.tools;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Tool component providing live weather forecasts and atmospheric metrics via WeatherStack API.
 * Registered as an AI tool for Spring AI ChatClient.
 */
@Component
public class WeatherTools {

    private static final Logger log = LoggerFactory.getLogger(WeatherTools.class);

    private final RestClient restClient;
    private final String accessKey;
    private final String baseUrl;

    /**
     * Initializes WeatherTools with WeatherStack API credentials and base URL.
     * 
     * @param accessKey WeatherStack API access key
     * @param baseUrl base URL for WeatherStack service
     */
    public WeatherTools(
            @Value("${weatherstack.access-key:3588ddfccae2530c28d16c345180ad17}") String accessKey,
            @Value("${weatherstack.base-url:http://api.weatherstack.com}") String baseUrl) {
        this.accessKey = accessKey;
        this.baseUrl = baseUrl;
        this.restClient = RestClient.builder().build();
    }

    /**
     * Fetches current real-time weather, temperature, humidity, wind, and precipitation for a city.
     * 
     * @param city destination city or region name
     * @return formatted weather forecast summary string
     */
    @Tool(name = "getForecast", description = "Get current weather for a city. Returns temperature, weather condition, and humidity.")
    public String getForecast(String city) {
        log.info("Fetching weather for city: {}", city);

        if (city == null || city.isBlank()) {
            return "City name cannot be empty.";
        }

        String cleanCity = city.replaceAll("\\(.*?\\)", "").trim();

        try {
            // Only mandatory params: access_key and query
            String uri = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/current")
                    .queryParam("access_key", accessKey)
                    .queryParam("query", cleanCity)
                    .toUriString();

            WeatherResponse response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(WeatherResponse.class);

            if (response != null && response.current() != null && response.location() != null) {
                String condition = (response.current().weatherDescriptions() != null && !response.current().weatherDescriptions().isEmpty())
                        ? response.current().weatherDescriptions().getFirst().trim()
                        : "Clear";

                int wind = response.current().windSpeed() != null ? response.current().windSpeed() : 18;
                double precip = response.current().precip() != null ? response.current().precip() : 0.0;
                String cityName = response.location().name();
                String countryName = response.location().country();

                return String.format("Weather in %s, %s: %d°C, %s, Humidity: %d%%, Wind: %d km/h, Precipitation: %.1f mm",
                        cityName,
                        countryName,
                        response.current().temperature(),
                        condition,
                        response.current().humidity(),
                        wind,
                        precip);
            } else if (response != null && response.error() != null) {
                return String.format("Weather unavailable for '%s': %s", cleanCity, response.error().info());
            }
        } catch (Exception e) {
            log.error("Failed to query weather for city {}: {}", cleanCity, e.getMessage());
            return String.format("Weather service error for '%s': %s", cleanCity, e.getMessage());
        }

        return String.format("No weather data found for '%s'.", cleanCity);
    }

    /**
     * DTO mapping WeatherStack top-level API response.
     */
    public record WeatherResponse(
            Location location,
            CurrentWeather current,
            ApiError error
    ) {}

    /**
     * DTO mapping destination location details and local timestamp.
     */
    public record Location(
            String name,
            String country,
            String localtime
    ) {}

    /**
     * DTO mapping current atmospheric and weather conditions.
     */
    public record CurrentWeather(
            int temperature,
            @JsonProperty("weather_descriptions") List<String> weatherDescriptions,
            int humidity,
            @JsonProperty("wind_speed") Integer windSpeed,
            Double precip,
            @JsonProperty("uv_index") Integer uvIndex,
            Integer feelslike
    ) {}

    /**
     * DTO mapping API error notifications.
     */
    public record ApiError(
            String info
    ) {}
}
