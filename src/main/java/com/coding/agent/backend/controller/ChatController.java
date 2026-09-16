package com.coding.agent.backend.controller;

import com.coding.agent.backend.model.ChatRequest;
import com.coding.agent.backend.service.ChatService;
import lombok.RequiredArgsConstructor;
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

@CrossOrigin
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

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
}
