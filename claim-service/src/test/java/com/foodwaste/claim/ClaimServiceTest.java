package com.foodwaste.claim;

import com.foodwaste.claim.entity.Claim;
import com.foodwaste.claim.exception.InvalidStateTransitionException;
import com.foodwaste.claim.repository.ClaimRepository;
import com.foodwaste.claim.service.ClaimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClaimServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private RestTemplate restTemplate;

    private ClaimService claimService;

    @BeforeEach
    void setUp() {
        claimService = new ClaimService(claimRepository, restTemplate);
        ReflectionTestUtils.setField(claimService, "foodServiceUrl", "http://food-service:8082");
        ReflectionTestUtils.setField(claimService, "notificationServiceUrl", "http://notification-service:8084");
    }

    @Test
    void updateClaimStatus_invalidTransition_throwsException() {
        UUID claimId = UUID.randomUUID();
        Claim claim = Claim.builder()
                .id(claimId)
                .foodPostId(UUID.randomUUID())
                .ngoId(UUID.randomUUID())
                .status("PENDING")
                .build();

        when(claimRepository.findById(claimId)).thenReturn(Optional.of(claim));

        // PENDING → PICKED_UP is invalid
        assertThrows(InvalidStateTransitionException.class,
                () -> claimService.updateClaimStatus(claimId, "PICKED_UP", UUID.randomUUID(), "NGO"));
    }

    @Test
    void updateClaimStatus_pendingToCancelled_byNgo_isValid() {
        UUID claimId = UUID.randomUUID();
        UUID ngoId = UUID.randomUUID();
        Claim claim = Claim.builder()
                .id(claimId)
                .foodPostId(UUID.randomUUID())
                .ngoId(ngoId)
                .status("PENDING")
                .build();

        when(claimRepository.findById(claimId)).thenReturn(Optional.of(claim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(inv -> inv.getArgument(0));
        // Mock notification call (non-blocking)
        doReturn(null).when(restTemplate).postForEntity(anyString(), any(), any());

        Claim result = claimService.updateClaimStatus(claimId, "CANCELLED", ngoId, "NGO");

        assertEquals("CANCELLED", result.getStatus());
    }

    @Test
    void updateClaimStatus_approvedToPickedUp_byRestaurant_isInvalid() {
        UUID claimId = UUID.randomUUID();
        Claim claim = Claim.builder()
                .id(claimId)
                .foodPostId(UUID.randomUUID())
                .ngoId(UUID.randomUUID())
                .status("APPROVED")
                .build();

        when(claimRepository.findById(claimId)).thenReturn(Optional.of(claim));

        // APPROVED → PICKED_UP by RESTAURANT is invalid (only NGO can do this)
        assertThrows(InvalidStateTransitionException.class,
                () -> claimService.updateClaimStatus(claimId, "PICKED_UP", UUID.randomUUID(), "RESTAURANT"));
    }
}
