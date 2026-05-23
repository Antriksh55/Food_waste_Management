package com.foodwaste.claim.repository;

import com.foodwaste.claim.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, UUID> {
    List<Claim> findByNgoId(UUID ngoId);
    List<Claim> findByFoodPostId(UUID foodPostId);
}
