package com.foodwaste.notification.controller;

import com.foodwaste.notification.dto.InternalNotificationRequest;
import com.foodwaste.notification.entity.Notification;
import com.foodwaste.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @PostMapping("/internal")
    public ResponseEntity<Notification> createInternal(
            @Valid @RequestBody InternalNotificationRequest request) {
        Notification notification = notificationService.createNotification(
                request.getUserId(),
                request.getMessage(),
                request.getType()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(notification);
    }
}
