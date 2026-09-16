package com.coding.agent.backend.tools;

import com.coding.agent.backend.model.Flight;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

@Component
public class FlightTools {

    private static final Logger log = LoggerFactory.getLogger(FlightTools.class);

    
    //search flight
    //dummy data
    private final List<Flight> flights = List.of(
            new Flight("AI-202", "Air India", "New York (JFK)", "London (LHR)", "2026-10-15", 650),
            new Flight("BA-178", "British Airways", "New York (JFK)", "London (LHR)", "2026-10-15", 720),
            new Flight("EK-501", "Emirates", "Dubai (DXB)", "Mumbai (BOM)", "2026-10-16", 380),
            new Flight("LH-400", "Lufthansa", "Frankfurt (FRA)", "New York (JFK)", "2026-10-17", 850),
            new Flight("UA-837", "United Airlines", "San Francisco (SFO)", "Tokyo (NRT)", "2026-10-18", 950),
            new Flight("QF-11", "Qantas", "Sydney (SYD)", "Los Angeles (LAX)", "2026-10-19", 1100),
            new Flight("6E-205", "IndiGo", "Delhi (DEL)", "Bangalore (BLR)", "2026-10-20", 95),
            new Flight("AF-007", "Air France", "Paris (CDG)", "New York (JFK)", "2026-10-21", 780));

    // search flight tool method
    @Tool(name = "searchFlight", description = "Search for available flights based on source, destination, and date.")
    public String searchFlight(String source, String destination, String date) {
        log.info("Inside searchFlight Tool - source: {}, destination: {}, date: {}", source, destination, date);

        List<Flight> filteredFlights = flights.stream()
                .filter(f -> f.getSource().equalsIgnoreCase(source)
                          && f.getDestination().equalsIgnoreCase(destination)
                          && f.getDate().equals(date))
                .toList();

        if (filteredFlights.isEmpty()) {
            log.info("No flights found for criteria: {} -> {} on {}", source, destination, date);
            return "No flights found for the given criteria.";
        }

        log.info("Found {} flight(s) matching criteria", filteredFlights.size());
        return filteredFlights.stream()
                .map(f -> f.getAirline() + " (" + f.getFlightNumber() + ") : $" + f.getPrice())
                .collect(Collectors.joining(", "));
    }

    //flight status
    //flight booking
}
