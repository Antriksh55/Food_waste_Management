package com.foodwaste.food.service;

import com.foodwaste.food.dto.FoodPostRequest;
import com.foodwaste.food.entity.FoodPost;
import com.foodwaste.food.repository.FoodPostRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodPostRepository foodPostRepository;

    public FoodPost createPost(FoodPostRequest request, UUID restaurantId) {
        FoodPost post = FoodPost.builder()
                .restaurantId(restaurantId)
                .title(request.getTitle())
                .foodType(request.getFoodType())
                .quantity(request.getQuantity())
                .expiryTime(request.getExpiryTime())
                .pickupAddress(request.getPickupAddress())
                .imageUrl(request.getImageUrl())
                .contactDetails(request.getContactDetails())
                .status("AVAILABLE")
                .build();
        return foodPostRepository.save(post);
    }

    public FoodPost updatePost(UUID postId, FoodPostRequest request, UUID restaurantId) {
        FoodPost post = getById(postId);
        if (!post.getRestaurantId().equals(restaurantId)) {
            throw new AccessDeniedException("You do not own this food post");
        }
        post.setTitle(request.getTitle());
        post.setFoodType(request.getFoodType());
        post.setQuantity(request.getQuantity());
        post.setExpiryTime(request.getExpiryTime());
        post.setPickupAddress(request.getPickupAddress());
        post.setImageUrl(request.getImageUrl());
        post.setContactDetails(request.getContactDetails());
        return foodPostRepository.save(post);
    }

    public void deletePost(UUID postId, UUID restaurantId) {
        FoodPost post = getById(postId);
        if (!post.getRestaurantId().equals(restaurantId)) {
            throw new AccessDeniedException("You do not own this food post");
        }
        foodPostRepository.delete(post);
    }

    public FoodPost getById(UUID postId) {
        return foodPostRepository.findById(postId)
                .orElseThrow(() -> new EntityNotFoundException("Food post not found: " + postId));
    }

    public Page<FoodPost> listAvailable(Pageable pageable) {
        return foodPostRepository.findByStatus("AVAILABLE", pageable);
    }

    public Page<FoodPost> search(String city, String foodType, Integer minQuantity, Pageable pageable) {
        return foodPostRepository.search(city, foodType, minQuantity, pageable);
    }

    public FoodPost updateStatus(UUID postId, String status) {
        FoodPost post = getById(postId);
        post.setStatus(status);
        return foodPostRepository.save(post);
    }
}
