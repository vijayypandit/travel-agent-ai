package com.coding.agent.backend.tools;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

/**
 * Tool component managing customer order tracking and cancellation.
 * Registered as an AI tool for Spring AI ChatClient.
 */
@Component
public class OrderTools {

    private static final Logger log = LoggerFactory.getLogger(OrderTools.class);

    // fake data
    private final Map<String, String> orders = Map.of(
            "1042", "Shipped - arriving tomorrow",
            "1043", "Processing - arriving not yet shipped",
            "1044", "Not Ordered - out of stock",
            "1045", "Delivered at your address"
    );

    /**
     * Queries the delivery/shipping status of a customer order by order ID.
     * 
     * @param orderId the unique order number
     * @return order fulfillment status string
     */
    @Tool(description = "Get the status of a customer order by its ID")
    public String getOrderStatus(String orderId) {
        log.info("Inside getOrderStatus, fetching status for orderId: {}", orderId);
        return orders.getOrDefault(orderId, "Order Not Found");
    }

    /**
     * Cancels an existing customer order by order ID.
     * 
     * @param orderId the unique order number to cancel
     * @return confirmation or error message
     */
    @Tool(description = "Cancel a customer order by its ID")
    public String cancelOrder(String orderId) {
        log.info("Inside cancelOrder request to cancel orderId: {}", orderId);
        if (orders.containsKey(orderId)) {
            return "Order " + orderId + " has been canceled";
        } else {
            return "Order Not Found";
        }
    }

    /**
     * Returns the aggregate count of all orders recorded in the system.
     * 
     * @return total order count
     */
    @Tool(description = "Get the total count of customer orders")
    public Integer getOrderCount() {
        log.info("Inside getOrderCount tool");
        return orders.size();
    }
}
