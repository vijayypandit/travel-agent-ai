package com.coding.agent.backend.tools;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

/**
 * Tool component providing inventory stock status and catalog queries for e-commerce items.
 * Registered as an AI tool for Spring AI ChatClient.
 */
@Component
public class InventoryTools {

    private static final Logger log = LoggerFactory.getLogger(InventoryTools.class);

    private final Map<String, Integer> stock = Map.of(
            "Bluetooth Headphone", 5,
            "Speaker", 4,
            "USB-C", 7,
            "Laptop", 8,
            "Desktop", 3,
            "Monitor with Set", 10,
            "WebCam", 10,
            "Noise-cancellation Headphones", 10
    );

    /**
     * Checks current stock quantity and availability for a specific product name.
     * 
     * @param productName name of the product to query
     * @return availability message with available quantity
     */
    @Tool(description = "Check the availability of a product by its name")
    public String checkStock(String productName) {
        log.info("Calling checkStock Tool for product: {}", productName);
        Integer quantity = stock.get(productName);

        if (quantity == null) {
            return "Product Not Found";
        } else if (quantity > 0) {
            return "Product Name : " + productName + " | Available Quantity : " + quantity;
        } else {
            return "Out Of Stock";
        }
    }

    /**
     * Calculates the aggregate sum of all inventory units in stock.
     * 
     * @return total count of units available in warehouse
     */
    @Tool(description = "Get the total count of the products in the stock")
    public Integer getTotalProductsInStock() {
        log.info("Calling getTotalProductsInStock Tool");
        return stock.values().stream().mapToInt(Integer::intValue).sum();
    }

    /**
     * Retrieves the names of all products currently having at least 1 unit in stock.
     * 
     * @return list of in-stock product names
     */
    @Tool(description = "Get the list of all products in stock")
    public List<String> getAllProductsInStocks() {
        log.info("Calling getAllProductsInStocks Tool");
        return stock.keySet().stream()
                .filter(name -> stock.get(name) > 0)
                .collect(Collectors.toList());
    }
}
