package com.coding.agent.backend.model;

/**
 * Response payload model containing the translated code and target language identifier.
 * 
 * @param translatedCode the pure translated code output
 * @param language normalized target language identifier
 */
public record TranslateCodeResponse(
        String translatedCode,
        String language
) {}
