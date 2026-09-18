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

    // Domestic Indian Hotel Inventory
    private final List<Hotel> hotels = List.of(
        // Mumbai
        new Hotel("H-MUM-1", "The Taj Mahal Palace", "Mumbai", 12000, 4.9, true),
        new Hotel("H-MUM-2", "Trident Nariman Point", "Mumbai", 7500, 4.7, true),
        new Hotel("H-MUM-3", "Bloomrooms @ Juhu", "Mumbai", 3800, 4.4, true),

        // Delhi
        new Hotel("H-DEL-1", "Taj Palace", "Delhi", 8500, 4.8, true),
        new Hotel("H-DEL-2", "The Imperial New Delhi", "Delhi", 9500, 4.9, true),
        new Hotel("H-DEL-3", "The Lalit New Delhi", "Delhi", 5200, 4.5, true),
        new Hotel("H-DEL-4", "Ginger Hotel New Delhi", "Delhi", 2800, 4.2, true),

        // Goa
        new Hotel("H-GOA-1", "Taj Exotica Resort & Spa", "Goa", 11000, 4.9, true),
        new Hotel("H-GOA-2", "W Goa (Vagator)", "Goa", 9000, 4.8, true),
        new Hotel("H-GOA-3", "Seashell Suites and Villas", "Goa", 4500, 4.6, true),
        new Hotel("H-GOA-4", "Goa Marriott Resort", "Goa", 7000, 4.7, true),

        // Bangalore
        new Hotel("H-BLR-1", "The Leela Palace Bengaluru", "Bangalore", 10500, 4.9, true),
        new Hotel("H-BLR-2", "ITC Gardenia", "Bangalore", 7200, 4.7, true),
        new Hotel("H-BLR-3", "Radisson Blu Atria", "Bangalore", 4200, 4.5, true),

        // Jaipur
        new Hotel("H-JAI-1", "Rambagh Palace", "Jaipur", 14000, 5.0, true),
        new Hotel("H-JAI-2", "ITC Rajputana", "Jaipur", 5500, 4.7, true),
        new Hotel("H-JAI-3", "Umaid Bhawan Heritage Hotel", "Jaipur", 3400, 4.4, true),

        // Kolkata
        new Hotel("H-CCU-1", "The Oberoi Grand", "Kolkata", 8000, 4.8, true),
        new Hotel("H-CCU-2", "ITC Sonar", "Kolkata", 6000, 4.6, true)
    );

    // Search hotels tool
    @Tool(name = "searchHotel", description = "Search for available hotels in an Indian city (e.g., Mumbai, Delhi, Goa, Bangalore, Jaipur, Kolkata) within a maximum budget per night in INR (₹).")
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
                      .append(", Price: ₹").append(hotel.pricePerNight()).append("/night")
                      .append(", Rating: ").append(hotel.rating()).append("★)");
            }
        }

        if (result.isEmpty()) {
            log.info("No hotels found in {} under budget ₹{}", city, maxPrice);
            return "No available hotels found in " + city + " within ₹" + maxPrice + " per night.";
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
                        ? "Booking confirmed for " + h.name() + " in " + h.city() + " at ₹" + h.pricePerNight() + "/night."
                        : h.name() + " is currently fully booked.")
                .orElse("Hotel with ID " + hotelId + " not found.");
    }
}
