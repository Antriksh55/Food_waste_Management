package com.foodwaste.food.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "food_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodPost {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "restaurant_id", nullable = false)
    private UUID restaurantId;

    @Column(nullable = false)
    private String title;

    @Column(name = "food_type", nullable = false)
    private String foodType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "expiry_time", nullable = false)
    private LocalDateTime expiryTime;

    @Column(name = "pickup_address", nullable = false)
    private String pickupAddress;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "contact_details")
    private String contactDetails;

    @Column(nullable = false)
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
