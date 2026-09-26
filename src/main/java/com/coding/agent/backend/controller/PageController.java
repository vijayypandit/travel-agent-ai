package com.coding.agent.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Web UI controller that serves the chat HTML view templates.
 */
@Controller
public class PageController {

    /**
     * Renders the primary chat interface template.
     * 
     * @return the Thymeleaf view template name ("chat")
     */
    @GetMapping({"/", "/chat-ui"})
    public String chatPage() {
        return "chat";
    }
}
