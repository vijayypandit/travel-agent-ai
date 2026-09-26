package com.coding.agent.backend.model;

/**
 * Request payload model for code translation across programming languages.
 * 
 * @param code the source code snippet to translate
 * @param sourceLanguage the original language identifier (e.g. python, java)
 * @param targetLanguage the desired destination language (e.g. java, csharp, javascript)
 */
public record TranslateCodeRequest(
        String code,
        String sourceLanguage,
        String targetLanguage
) {}
