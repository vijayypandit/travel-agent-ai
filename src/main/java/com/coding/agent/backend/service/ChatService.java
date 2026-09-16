package com.coding.agent.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatClient chatClient;

    public String chat(String query, String conversatinId) {
         
        return chatClient
                .prompt()
                .user(query)
                .advisors(a
                        -> a.param(ChatMemory.CONVERSATION_ID, conversatinId)
                )
                .call()
                .content();
    }
}
