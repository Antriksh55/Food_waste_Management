package com.foodwaste.claim.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Claim {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "food_post_id", nullable = false)
    private UUID foodPostId;

    @Column(name = "ngo_id", nullable = false)
    private UUID ngoId;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "claimed_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime claimedAt = LocalDateTime.now();
}
