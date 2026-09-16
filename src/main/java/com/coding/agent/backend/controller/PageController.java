package com.coding.agent.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping({"/", "/chat-ui"})
    public String chatPage() {
        return "chat";
    }
}
