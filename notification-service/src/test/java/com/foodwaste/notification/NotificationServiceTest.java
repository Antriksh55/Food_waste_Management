package com.foodwaste.notification;

import com.foodwaste.notification.entity.Notification;
import com.foodwaste.notification.repository.NotificationRepository;
import com.foodwaste.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository);
    }

    @Test
    void createNotification_persistsAndReturns() {
        UUID userId = UUID.randomUUID();
        Notification saved = Notification.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .message("Test message")
                .type("CLAIM_PENDING")
                .build();

        when(notificationRepository.save(any(Notification.class))).thenReturn(saved);

        Notification result = notificationService.createNotification(userId, "Test message", "CLAIM_PENDING");

        assertNotNull(result);
        assertEquals(userId, result.getUserId());
        assertEquals("CLAIM_PENDING", result.getType());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void getNotificationsForUser_returnsUserNotifications() {
        UUID userId = UUID.randomUUID();
        List<Notification> notifications = List.of(
                Notification.builder().id(UUID.randomUUID()).userId(userId).message("msg1").type("T1").build(),
                Notification.builder().id(UUID.randomUUID()).userId(userId).message("msg2").type("T2").build()
        );

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(notifications);

        List<Notification> result = notificationService.getNotificationsForUser(userId);

        assertEquals(2, result.size());
        verify(notificationRepository, times(1)).findByUserIdOrderByCreatedAtDesc(userId);
    }
}
