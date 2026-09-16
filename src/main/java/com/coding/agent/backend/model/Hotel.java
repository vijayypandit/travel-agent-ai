package com.coding.agent.backend.model;

public record Hotel(
    String id,
    String name,
    String city,
    int pricePerNight,
    double rating,
    boolean available
) {
}
