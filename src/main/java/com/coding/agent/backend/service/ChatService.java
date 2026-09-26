package com.coding.agent.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.stereotype.Service;

/**
 * Service orchestrating AI interactions via Spring AI's ChatClient.
 * Handles contextual multi-turn conversation and isolated polyglot code translations.
 */
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatClient chatClient;

    /**
     * Executes a chat prompt with conversation memory retained by conversation ID.
     * 
     * @param query user prompt or question text
     * @param conversatinId conversation identifier for chat memory advisor
     * @return AI assistant response content
     */
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

    /**
     * Translates a code snippet to a target programming language using an isolated prompt.
     * 
     * @param code original source code
     * @param targetLanguage target language name (e.g. Java, Python, C#, JavaScript, TypeScript, Go)
     * @return translated code from AI model
     */
    public String translateCode(String code, String targetLanguage) {
        String prompt = String.format("""
                You are an expert polyglot software engineer and compiler specialist.
                Translate the following code into %s.

                Strict Rules:
                1. Output ONLY the translated code inside standard fenced code block (e.g. ```%s ... ```).
                2. Do not include any introductory text, explanation, greeting, or markdown text outside the code block.
                3. Include all necessary imports, class definitions, and idiomatic syntax for %s.
                4. Maintain original logic, variables, and comments accurately.

                Source code to translate:
                %s
                """, targetLanguage, targetLanguage.toLowerCase(), targetLanguage, code);

        return chatClient
                .prompt()
                .user(prompt)
                .call()
                .content();
    }
}
