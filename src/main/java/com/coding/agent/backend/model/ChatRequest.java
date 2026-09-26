package com.coding.agent.backend.model;

/**
 * Request payload model representing an incoming user chat message.
 * 
 * @param message the user query or instruction text
 * @param conversationId the unique conversation identifier for memory retention
 */
public record ChatRequest(String message, String conversationId) {
}
