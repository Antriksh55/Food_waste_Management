package com.foodwaste.claim.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClaimStatusRequest {

    @NotBlank(message = "status is required")
    private String status;
}
