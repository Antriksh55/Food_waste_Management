package com.foodwaste.claim.service;

import com.foodwaste.claim.entity.Claim;
import com.foodwaste.claim.exception.InvalidStateTransitionException;
import com.foodwaste.claim.exception.ResourceConflictException;
import com.foodwaste.claim.repository.ClaimRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final RestTemplate restTemplate;

    @Value("${food.service.url}")
    private String foodServiceUrl;

    @Value("${notification.service.url}")
    private String notificationServiceUrl;

    public Claim createClaim(UUID foodPostId, UUID ngoId, String authToken) {
        // Check food post is AVAILABLE via food-service
        Map<String, Object> foodPost = getFoodPost(foodPostId);
        String status = (String) foodPost.get("status");
        if (!"AVAILABLE".equals(status)) {
            throw new ResourceConflictException("Food post is not available for claiming. Current status: " + status);
        }

        Claim claim = Claim.builder()
                .foodPostId(foodPostId)
                .ngoId(ngoId)
                .status("PENDING")
                .build();
        Claim saved = claimRepository.save(claim);

        // Notify restaurant
        String restaurantId = foodPost.get("restaurantId") != null
                ? foodPost.get("restaurantId").toString()
                : null;
        if (restaurantId != null) {
            try {
                sendNotification(restaurantId, "A new claim has been submitted for your food post.", "CLAIM_PENDING");
            } catch (Exception e) {
                log.error("Failed to send CLAIM_PENDING notification: {}", e.getMessage());
            }
        }

        return saved;
    }

    public Claim updateClaimStatus(UUID claimId, String newStatus, UUID userId, String role) {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found: " + claimId));

        String currentStatus = claim.getStatus();
        validateTransition(currentStatus, newStatus, role);

        String previousStatus = currentStatus;
        claim.setStatus(newStatus);
        Claim saved = claimRepository.save(claim);

        // Side effects
        try {
            handleSideEffects(saved, previousStatus, newStatus);
        } catch (Exception e) {
            // If food-service call fails on APPROVED, roll back
            if ("APPROVED".equals(newStatus)) {
                claim.setStatus(previousStatus);
                claimRepository.save(claim);
                throw new RuntimeException("Failed to update food post status: " + e.getMessage());
            }
            log.error("Side effect failed for claim {}: {}", claimId, e.getMessage());
        }

        return saved;
    }

    public List<Claim> getClaimsForUser(UUID userId, String role) {
        if ("NGO".equals(role)) {
            return claimRepository.findByNgoId(userId);
        } else if ("RESTAURANT".equals(role)) {
            // Return all claims for food posts owned by this restaurant
            // We need to check food-service for each claim — simplified: return all and filter
            return claimRepository.findAll().stream()
                    .filter(c -> isOwnedByRestaurant(c.getFoodPostId(), userId))
                    .toList();
        }
        return List.of();
    }

    private void validateTransition(String from, String to, String role) {
        boolean valid = switch (from) {
            case "PENDING" -> ("APPROVED".equals(to) && "RESTAURANT".equals(role))
                    || ("CANCELLED".equals(to) && ("RESTAURANT".equals(role) || "NGO".equals(role)));
            case "APPROVED" -> ("PICKED_UP".equals(to) && "NGO".equals(role))
                    || ("CANCELLED".equals(to) && ("RESTAURANT".equals(role) || "NGO".equals(role)));
            default -> false;
        };

        if (!valid) {
            throw new InvalidStateTransitionException(
                    "Transition from " + from + " to " + to + " is not permitted for role " + role);
        }
    }

    private void handleSideEffects(Claim claim, String previousStatus, String newStatus) {
        Map<String, Object> foodPost = getFoodPost(claim.getFoodPostId());
        String ngoId = claim.getNgoId().toString();

        switch (newStatus) {
            case "APPROVED" -> {
                updateFoodPostStatus(claim.getFoodPostId(), "CLAIMED");
                sendNotification(ngoId, "Your claim has been approved!", "CLAIM_APPROVED");
            }
            case "CANCELLED" -> {
                if ("APPROVED".equals(previousStatus)) {
                    updateFoodPostStatus(claim.getFoodPostId(), "AVAILABLE");
                }
                sendNotification(ngoId, "Your claim has been cancelled.", "CLAIM_CANCELLED");
            }
            case "PICKED_UP" -> {
                sendNotification(ngoId, "Pickup confirmed. Thank you!", "CLAIM_PICKED_UP");
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFoodPost(UUID foodPostId) {
        try {
            return restTemplate.getForObject(
                    foodServiceUrl + "/api/foods/" + foodPostId,
                    Map.class
            );
        } catch (Exception e) {
            throw new EntityNotFoundException("Food post not found: " + foodPostId);
        }
    }

    private void updateFoodPostStatus(UUID foodPostId, String status) {
        Map<String, String> body = Map.of("status", status);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
        restTemplate.put(foodServiceUrl + "/api/foods/" + foodPostId + "/status", entity);
    }

    private void sendNotification(String userId, String message, String type) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", userId);
        payload.put("message", message);
        payload.put("type", type);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        restTemplate.postForEntity(
                notificationServiceUrl + "/api/notifications/internal",
                entity,
                Void.class
        );
    }

    private boolean isOwnedByRestaurant(UUID foodPostId, UUID restaurantId) {
        try {
            Map<String, Object> post = getFoodPost(foodPostId);
            Object rid = post.get("restaurantId");
            return rid != null && rid.toString().equals(restaurantId.toString());
        } catch (Exception e) {
            return false;
        }
    }
}
