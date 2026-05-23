package com.foodwaste.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class InternalNotificationRequest {

    @NotNull(message = "userId is required")
    private UUID userId;

    @NotBlank(message = "message is required")
    private String message;

    @NotBlank(message = "type is required")
    private String type;
}
