package com.coding.agent.backend.tools;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import com.coding.agent.backend.model.Flight;

@Component
public class FlightTools {

    private static final Logger log = LoggerFactory.getLogger(FlightTools.class);

    // Domestic Indian Flights
    private final List<Flight> flights = List.of(
            new Flight("6E-205", "IndiGo", "Delhi (DEL)", "Mumbai (BOM)", "2026-10-20", 4500),
            new Flight("AI-806", "Air India", "Delhi (DEL)", "Mumbai (BOM)", "2026-10-20", 5200),
            new Flight("QP-1102", "Akasa Air", "Delhi (DEL)", "Mumbai (BOM)", "2026-10-20", 4100),
            
            new Flight("6E-451", "IndiGo", "Mumbai (BOM)", "Delhi (DEL)", "2026-10-22", 4700),
            new Flight("AI-624", "Air India", "Mumbai (BOM)", "Delhi (DEL)", "2026-10-22", 5100),

            new Flight("6E-512", "IndiGo", "Delhi (DEL)", "Bangalore (BLR)", "2026-10-20", 5800),
            new Flight("AI-504", "Air India", "Delhi (DEL)", "Bangalore (BLR)", "2026-10-20", 6200),

            new Flight("6E-782", "IndiGo", "Mumbai (BOM)", "Goa (GOI)", "2026-10-21", 3200),
            new Flight("AI-883", "Air India", "Mumbai (BOM)", "Goa (GOI)", "2026-10-21", 3800),

            new Flight("6E-341", "IndiGo", "Bangalore (BLR)", "Goa (GOI)", "2026-10-21", 2800),
            new Flight("AI-510", "Air India", "Bangalore (BLR)", "Delhi (DEL)", "2026-10-25", 5900),

            new Flight("6E-901", "IndiGo", "Delhi (DEL)", "Jaipur (JAI)", "2026-10-22", 2200),
            new Flight("AI-491", "Air India", "Delhi (DEL)", "Kolkata (CCU)", "2026-10-23", 4900),
            new Flight("6E-618", "IndiGo", "Kolkata (CCU)", "Mumbai (BOM)", "2026-10-24", 5400)
    );

    private String cleanCity(String city) {
        if (city == null) return "";
        return city.replaceAll("\\(.*?\\)", "").trim().toLowerCase();
    }

    @Tool(name = "searchFlight", description = "Search for available domestic Indian flights based on source city, destination city, and date (YYYY-MM-DD). Prices are in INR (₹).")
    public String searchFlight(String source, String destination, String date) {
        log.info("Inside searchFlight Tool - source: {}, destination: {}, date: {}", source, destination, date);

        String cleanSrc = cleanCity(source);
        String cleanDest = cleanCity(destination);

        List<Flight> filteredFlights = flights.stream()
                .filter(f -> {
                    String fSrc = cleanCity(f.getSource());
                    String fDest = cleanCity(f.getDestination());
                    boolean srcMatch = fSrc.contains(cleanSrc) || cleanSrc.contains(fSrc);
                    boolean destMatch = fDest.contains(cleanDest) || cleanDest.contains(fDest);
                    boolean dateMatch = (date == null || date.isBlank()) || f.getDate().equals(date.trim());
                    return srcMatch && destMatch && dateMatch;
                })
                .toList();

        if (filteredFlights.isEmpty()) {
            log.info("No flights found for criteria: {} -> {} on {}", source, destination, date);
            return "No domestic flights found from " + source + " to " + destination + " on " + date + ".";
        }

        log.info("Found {} flight(s) matching criteria", filteredFlights.size());
        return filteredFlights.stream()
                .map(f -> f.getAirline() + " (" + f.getFlightNumber() + ") from " + f.getSource() + " to " + f.getDestination() + " on " + f.getDate() + " : ₹" + f.getPrice())
                .collect(Collectors.joining(", "));
    }
}
