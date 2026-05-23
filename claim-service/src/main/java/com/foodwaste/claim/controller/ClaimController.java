package com.foodwaste.claim.controller;

import com.foodwaste.claim.dto.ClaimRequest;
import com.foodwaste.claim.dto.ClaimStatusRequest;
import com.foodwaste.claim.entity.Claim;
import com.foodwaste.claim.service.ClaimService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;

    @PostMapping
    public ResponseEntity<Claim> createClaim(@Valid @RequestBody ClaimRequest request,
                                              Authentication auth) {
        UUID ngoId = UUID.fromString(auth.getName());
        String token = extractToken(auth);
        Claim claim = claimService.createClaim(request.getFoodPostId(), ngoId, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(claim);
    }

    @GetMapping
    public ResponseEntity<List<Claim>> getClaims(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        String role = extractRole(auth);
        return ResponseEntity.ok(claimService.getClaimsForUser(userId, role));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Claim> updateStatus(@PathVariable UUID id,
                                               @Valid @RequestBody ClaimStatusRequest request,
                                               Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        String role = extractRole(auth);
        Claim claim = claimService.updateClaimStatus(id, request.getStatus(), userId, role);
        return ResponseEntity.ok(claim);
    }

    private String extractRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("");
    }

    private String extractToken(Authentication auth) {
        // Token is not directly available here; inter-service calls use no auth for food-service status updates
        return "";
    }
}
