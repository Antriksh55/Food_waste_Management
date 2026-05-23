package com.foodwaste.notification.service;

import com.foodwaste.notification.entity.Notification;
import com.foodwaste.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Notification createNotification(UUID userId, String message, String type) {
        Notification notification = Notification.builder()
                .userId(userId)
                .message(message)
                .type(type)
                .build();
        Notification saved = notificationRepository.save(notification);

        // Simulate email/SMS
        log.info("[EMAIL] To: {} | Type: {} | Message: {}", userId, type, message);

        return saved;
    }

    public List<Notification> getNotificationsForUser(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
