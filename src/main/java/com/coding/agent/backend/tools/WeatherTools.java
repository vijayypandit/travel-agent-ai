package com.coding.agent.backend.tools;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

@Component
public class WeatherTools {

    private static final Logger log = LoggerFactory.getLogger(WeatherTools.class);

    // Mock weather data by city
    private final Map<String, String> weatherData = Map.of(
            "New York", "22°C, Sunny, Humidity 55%",
            "London", "16°C, Cloudy with light rain, Humidity 80%",
            "Paris", "20°C, Partly Cloudy, Humidity 65%",
            "Tokyo", "25°C, Clear, Humidity 60%",
            "New Delhi", "31°C, Warm and Sunny, Humidity 48%",
            "Sydney", "19°C, Breezy, Humidity 70%"
    );

    @Tool(name = "getForecast", description = "Get the weather forecast for a specific city and date. Returns the temperature, weather conditions, and humidity.")
    public String getForecast(String city, String date) {
        log.info("Inside getForecast tool for city: {}, date: {}", city, date);

        if (city == null || city.isBlank()) {
            return "City name cannot be empty.";
        }

        String formattedDate = (date != null && !date.isBlank()) ? date.trim() : "selected date";

        String condition = weatherData.entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(city.trim()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse("24°C, Pleasant and Clear, Humidity 60%");

        return String.format("Weather in %s on %s: %s", city.trim(), formattedDate, condition);
    }
}
