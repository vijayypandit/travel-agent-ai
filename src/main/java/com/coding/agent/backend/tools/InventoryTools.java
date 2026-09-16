package com.coding.agent.backend.tools;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

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

    @Tool(description = "Get the total count of the products in the stock")
    public Integer getTotalProductsInStock() {
        log.info("Calling getTotalProductsInStock Tool");
        return stock.values().stream().mapToInt(Integer::intValue).sum();
    }

    @Tool(description = "Get the list of all products in stock")
    public List<String> getAllProductsInStocks() {
        log.info("Calling getAllProductsInStocks Tool");
        return stock.keySet().stream()
                .filter(name -> stock.get(name) > 0)
                .collect(Collectors.toList());
    }
}
