package com.foodwaste.food.controller;

import com.foodwaste.food.dto.FoodPostRequest;
import com.foodwaste.food.dto.StatusUpdateRequest;
import com.foodwaste.food.entity.FoodPost;
import com.foodwaste.food.service.FoodService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/foods")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;

    @GetMapping
    public ResponseEntity<Page<FoodPost>> listAll(Pageable pageable) {
        return ResponseEntity.ok(foodService.listAllActive(pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<FoodPost>> search(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String foodType,
            @RequestParam(required = false) Integer minQuantity,
            Pageable pageable) {
        return ResponseEntity.ok(foodService.search(city, foodType, minQuantity, pageable));
    }

    @GetMapping("/my")
    public ResponseEntity<List<FoodPost>> getMyPosts(Authentication auth) {
        UUID restaurantId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(foodService.getMyPosts(restaurantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FoodPost> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(foodService.getById(id));
    }

    @PostMapping
    public ResponseEntity<FoodPost> create(@Valid @RequestBody FoodPostRequest request,
                                            Authentication auth) {
        UUID restaurantId = UUID.fromString(auth.getName());
        FoodPost post = foodService.createPost(request, restaurantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(post);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FoodPost> update(@PathVariable UUID id,
                                            @Valid @RequestBody FoodPostRequest request,
                                            Authentication auth) {
        UUID restaurantId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(foodService.updatePost(id, request, restaurantId));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<FoodPost> updateStatus(@PathVariable UUID id,
                                                  @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(foodService.updateStatus(id, request.getStatus(), request.getClaimedByName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication auth) {
        UUID restaurantId = UUID.fromString(auth.getName());
        foodService.deletePost(id, restaurantId);
        return ResponseEntity.noContent().build();
    }
}
