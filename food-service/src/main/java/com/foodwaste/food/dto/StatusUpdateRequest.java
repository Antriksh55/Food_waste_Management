package com.foodwaste.food.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StatusUpdateRequest {

    @NotBlank(message = "Status is required")
    private String status;

    // Optional: name of the NGO/volunteer who claimed the food
    private String claimedByName;
}
