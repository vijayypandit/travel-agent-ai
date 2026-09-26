package com.coding.agent.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * Domain entity model representing a domestic flight with schedule and pricing information.
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Flight {
    private String flightNumber;
    private String airline;
    private String source;
    private String destination;
    private String date;
    private Integer price;
}