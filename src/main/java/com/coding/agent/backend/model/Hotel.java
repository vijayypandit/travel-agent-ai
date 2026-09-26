package com.coding.agent.backend.model;

/**
 * Domain entity model representing a hotel accommodation and booking availability.
 * 
 * @param id unique hotel identifier
 * @param name hotel brand or property name
 * @param city destination city or region
 * @param pricePerNight nightly room rate in INR (₹)
 * @param rating guest review score (e.g. 8.7)
 * @param available whether the property currently has vacancies
 */
public record Hotel(
    String id,
    String name,
    String city,
    int pricePerNight,
    double rating,
    boolean available
) {
}
