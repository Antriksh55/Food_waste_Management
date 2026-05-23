package com.foodwaste.food.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FoodPostRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Food type is required")
    private String foodType;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotNull(message = "Expiry time is required")
    private LocalDateTime expiryTime;

    @NotBlank(message = "Pickup address is required")
    private String pickupAddress;

    private String imageUrl;

    private String contactDetails;
}
