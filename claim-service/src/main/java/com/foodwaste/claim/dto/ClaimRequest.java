package com.foodwaste.claim.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ClaimRequest {

    @NotNull(message = "foodPostId is required")
    private UUID foodPostId;

    // Name of the NGO/volunteer claiming the food
    private String ngoName;
}
