package com.coding.agent.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.coding.agent.backend.model.ChatRequest;
import com.coding.agent.backend.model.TranslateCodeRequest;
import com.coding.agent.backend.model.TranslateCodeResponse;
import com.coding.agent.backend.service.ChatService;

import lombok.RequiredArgsConstructor;

/**
 * REST controller for chat interactions and code translation.
 * Exposes endpoints for synchronous GET/POST user queries and polyglot code translations.
 */
@CrossOrigin
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /**
     * Handles simple GET-based chat requests via URL query parameter.
     * 
     * @param conversationId unique session ID from request header
     * @param message user query message string
     * @return AI assistant text response
     */
    @GetMapping
    public ResponseEntity<String> chatGet(
            @RequestHeader(value = "Conversation-Id", required = false, defaultValue = "default-session") String conversationId,
            @RequestParam(name = "message", required = false) String message) {
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body("Query parameter 'message' is required.");
        }
        String response = chatService.chat(message.trim(), conversationId);
        return ResponseEntity.ok(response);
    }

    /**
     * Handles standard JSON POST chat requests with session tracking.
     * 
     * @param headerConversationId fallback session ID from HTTP header
     * @param request payload containing user message and optional conversation ID
     * @return AI assistant text response
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> chat(
            @RequestHeader(value = "Conversation-Id", required = false, defaultValue = "default-session") String headerConversationId,
            @RequestBody ChatRequest request) {
        if (request == null || request.message() == null || request.message().isBlank()) {
            return ResponseEntity.badRequest().body("Request body 'message' cannot be empty.");
        }
        String conversationId = (request.conversationId() != null && !request.conversationId().isBlank())
                ? request.conversationId().trim()
                : headerConversationId;

        String response = chatService.chat(request.message().trim(), conversationId);
        return ResponseEntity.ok(response);
    }

    /**
     * Translates a given code snippet to another programming language (Java, JavaScript, C#, Python, TypeScript, Go).
     * 
     * @param request payload containing source code and desired target language
     * @return translated code response without markdown fences
     */
    @PostMapping(value = "/translate-code", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TranslateCodeResponse> translateCode(@RequestBody TranslateCodeRequest request) {
        if (request == null || request.code() == null || request.code().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String targetLang = (request.targetLanguage() != null && !request.targetLanguage().isBlank())
                ? request.targetLanguage().trim()
                : "python";

        String result = chatService.translateCode(request.code().trim(), targetLang);

        // Strip markdown code fences if present to return clean, pure code
        String cleanCode = result;
        if (cleanCode != null) {
            cleanCode = cleanCode.replaceAll("(?s)^\\s*```[a-zA-Z0-9_-]*\\r?\\n", "");
            cleanCode = cleanCode.replaceAll("(?s)\\r?\\n```\\s*$", "");
            cleanCode = cleanCode.trim();
        } else {
            cleanCode = "";
        }

        return ResponseEntity.ok(new TranslateCodeResponse(cleanCode, targetLang.toLowerCase()));
    }
}
