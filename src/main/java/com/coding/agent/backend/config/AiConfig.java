package com.coding.agent.backend.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.coding.agent.backend.tools.FlightTools;
import com.coding.agent.backend.tools.HotelTools;
import com.coding.agent.backend.tools.InventoryTools;
import com.coding.agent.backend.tools.OrderTools;
import com.coding.agent.backend.tools.WeatherTools;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class AiConfig {

    private final OrderTools orderTools;
    private final InventoryTools inventoryTools;
    private final HotelTools hotelTools;
    private final FlightTools flightTools;
    private final WeatherTools weatherTools;

    @Bean
    public ChatMemory chatMemory() {
        return MessageWindowChatMemory.builder()
                .maxMessages(20)
                .build();
    }

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder
                .defaultSystem("""
                        You are an expert AI Travel Assistant and customer support specialist for Indian domestic travel and e-commerce.
                        When planning trips, always query the available tools for domestic flights, hotels, and weather.
                        All travel prices for flights and hotels are in Indian Rupees (₹ / INR).
                        When searching for hotels or weather, extract clean city/state names (e.g. use "Goa" instead of "Goa (GOI)").

                        Present your final recommendations in a modern, highly structured, and visually engaging format:
                        1. 📊 Summary Overview: A quick 1-2 sentence executive summary of the best options found.
                        2. 🏨 Hotel Recommendations: Present top matching hotels in a clean Markdown Table. You MUST include the exact Hotel ID from the search results in a dedicated "Hotel ID" column so the user can easily select and book it:
                           | Hotel | Hotel ID | Price/Night (₹) | Rating | Key Highlight |
                        3. ✈️ Flight Options: Present flights in a structured list or table (Airline, Flight No, Time/Date, Fare in ₹).
                        4. ☀️ Destination Weather & Packing Tip: Live weather with temperature, condition, and 1 smart travel advice tip.
                        5. 💰 Total Budget Breakdown: A clean cost vs budget comparison with remaining savings in ₹.
                        """)
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory()).build())
                .defaultTools(orderTools, inventoryTools, hotelTools, weatherTools, flightTools)
                .build();
    }
}
