package com.coding.agent.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main entry point for the Spring AI Agent Backend Application.
 * Bootstraps the Spring Boot context, initializes AI tools, REST APIs, and web services.
 */
@SpringBootApplication
public class AiAgentBackendApplication {

	/**
	 * Launches the Spring Boot application.
	 * 
	 * @param args command-line arguments passed to the application
	 */
	public static void main(String[] args) {
		SpringApplication.run(AiAgentBackendApplication.class, args);
	}

}
