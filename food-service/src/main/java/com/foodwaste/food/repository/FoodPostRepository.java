package com.foodwaste.food.repository;

import com.foodwaste.food.entity.FoodPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface FoodPostRepository extends JpaRepository<FoodPost, UUID> {

    Page<FoodPost> findByStatus(String status, Pageable pageable);

    @Query("SELECT f FROM FoodPost f WHERE f.status = 'AVAILABLE' " +
           "AND (:city IS NULL OR LOWER(f.pickupAddress) LIKE LOWER(CONCAT('%', :city, '%'))) " +
           "AND (:foodType IS NULL OR LOWER(f.foodType) = LOWER(:foodType)) " +
           "AND (:minQuantity IS NULL OR f.quantity >= :minQuantity)")
    Page<FoodPost> search(@Param("city") String city,
                          @Param("foodType") String foodType,
                          @Param("minQuantity") Integer minQuantity,
                          Pageable pageable);

    List<FoodPost> findByStatusAndExpiryTimeBefore(String status, LocalDateTime time);

    List<FoodPost> findByRestaurantId(UUID restaurantId);
}
