package com.foodwaste.food.scheduler;

import com.foodwaste.food.entity.FoodPost;
import com.foodwaste.food.repository.FoodPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExpiryScheduler {

    private final FoodPostRepository foodPostRepository;
    private final RestTemplate restTemplate;

    @Value("${notification.service.url}")
    private String notificationServiceUrl;

    @Scheduled(fixedDelay = 60000)
    public void expireOldPosts() {
        List<FoodPost> expiredPosts = foodPostRepository
                .findByStatusAndExpiryTimeBefore("AVAILABLE", LocalDateTime.now());

        for (FoodPost post : expiredPosts) {
            post.setStatus("EXPIRED");
            foodPostRepository.save(post);
            log.info("Food post {} marked as EXPIRED", post.getId());

            try {
                sendExpiryNotification(post);
            } catch (Exception e) {
                log.error("Failed to send expiry notification for post {}: {}", post.getId(), e.getMessage());
            }
        }
    }

    private void sendExpiryNotification(FoodPost post) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", post.getRestaurantId().toString());
        payload.put("message", "Your food post '" + post.getTitle() + "' has expired.");
        payload.put("type", "FOOD_EXPIRED");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        restTemplate.postForEntity(
                notificationServiceUrl + "/api/notifications/internal",
                entity,
                Void.class
        );
    }
}
