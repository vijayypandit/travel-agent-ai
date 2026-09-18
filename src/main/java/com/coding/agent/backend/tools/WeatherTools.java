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

@Component
public class WeatherTools {

    private static final Logger log = LoggerFactory.getLogger(WeatherTools.class);

    private final RestClient restClient;
    private final String accessKey;
    private final String baseUrl;

    public WeatherTools(
            @Value("${weatherstack.access-key:3588ddfccae2530c28d16c345180ad17}") String accessKey,
            @Value("${weatherstack.base-url:http://api.weatherstack.com}") String baseUrl) {
        this.accessKey = accessKey;
        this.baseUrl = baseUrl;
        this.restClient = RestClient.builder().build();
    }

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

                return String.format("Weather in %s, %s: %d°C, %s, Humidity: %d%%",
                        response.location().name(),
                        response.location().country(),
                        response.current().temperature(),
                        condition,
                        response.current().humidity());
            } else if (response != null && response.error() != null) {
                return String.format("Weather unavailable for '%s': %s", cleanCity, response.error().info());
            }
        } catch (Exception e) {
            log.error("Failed to query weather for city {}: {}", cleanCity, e.getMessage());
            return String.format("Weather service error for '%s': %s", cleanCity, e.getMessage());
        }

        return String.format("No weather data found for '%s'.", cleanCity);
    }

    // Minimal JSON models (only essential fields)
    public record WeatherResponse(
            Location location,
            CurrentWeather current,
            ApiError error
    ) {}

    public record Location(
            String name,
            String country
    ) {}

    public record CurrentWeather(
            int temperature,
            @JsonProperty("weather_descriptions") List<String> weatherDescriptions,
            int humidity
    ) {}

    public record ApiError(
            String info
    ) {}
}
