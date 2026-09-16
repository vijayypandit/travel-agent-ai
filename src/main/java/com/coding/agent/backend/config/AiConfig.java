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
                        You are an expert AI Travel Assistant and customer support specialist.
                        When planning trips, always query the available tools for flights, hotels, and weather.
                        When searching for hotels or weather, extract clean city names (e.g., use "New York" instead of "New York (JFK)").
                        Present your final recommendations in a clean, professional, and well-structured itinerary format:
                        - ✈️ Flight Option (Airline, Flight Number, Date, Price)
                        - 🏨 Hotel Accommodation (Name, Nightly Rate, Total Stay Cost, Rating)
                        - ☀️ Destination Weather & Packing Tip
                        - 💰 Total Budget Breakdown (Flight + Hotel vs Budget, and Remaining Balance)
                        """)
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory()).build())
                .defaultTools(orderTools, inventoryTools, hotelTools, weatherTools, flightTools)
                .build();
    }
}
