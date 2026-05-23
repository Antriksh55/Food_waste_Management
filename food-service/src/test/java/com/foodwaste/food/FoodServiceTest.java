package com.foodwaste.food;

import com.foodwaste.food.dto.FoodPostRequest;
import com.foodwaste.food.entity.FoodPost;
import com.foodwaste.food.repository.FoodPostRepository;
import com.foodwaste.food.service.FoodService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FoodServiceTest {

    @Mock
    private FoodPostRepository foodPostRepository;

    private FoodService foodService;

    @BeforeEach
    void setUp() {
        foodService = new FoodService(foodPostRepository);
    }

    @Test
    void createPost_validRequest_returnsPost() {
        UUID restaurantId = UUID.randomUUID();
        FoodPostRequest req = new FoodPostRequest();
        req.setTitle("Bread");
        req.setFoodType("Bakery");
        req.setQuantity(10);
        req.setExpiryTime(LocalDateTime.now().plusHours(2));
        req.setPickupAddress("123 Main St, Mumbai");

        FoodPost saved = FoodPost.builder()
                .id(UUID.randomUUID())
                .restaurantId(restaurantId)
                .title("Bread")
                .status("AVAILABLE")
                .build();

        when(foodPostRepository.save(any(FoodPost.class))).thenReturn(saved);

        FoodPost result = foodService.createPost(req, restaurantId);

        assertNotNull(result);
        assertEquals("AVAILABLE", result.getStatus());
        verify(foodPostRepository, times(1)).save(any(FoodPost.class));
    }

    @Test
    void deletePost_notOwner_throwsAccessDenied() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();

        FoodPost post = FoodPost.builder()
                .id(postId)
                .restaurantId(ownerId)
                .status("AVAILABLE")
                .build();

        when(foodPostRepository.findById(postId)).thenReturn(Optional.of(post));

        assertThrows(AccessDeniedException.class, () -> foodService.deletePost(postId, otherId));
    }

    @Test
    void getById_notFound_throwsEntityNotFound() {
        UUID id = UUID.randomUUID();
        when(foodPostRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> foodService.getById(id));
    }
}
