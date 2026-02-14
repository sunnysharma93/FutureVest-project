package com.futurevest.infrastructure.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", unique = true, columnList = "email"),
    @Index(name = "idx_user_role", columnList = "role")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class UserEntity extends BaseEntity {

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role = UserRole.USER;

    @Column(name = "resume_url")
    private String resumeUrl;

    @Column(name = "aadhaar_url")
    private String aadhaarUrl;

    @Column(nullable = false)
    private boolean enabled = true;

    @OneToMany(mappedBy = "sender", fetch = FetchType.LAZY)
    private java.util.List<ChatMessageEntity> sentMessages;

    @OneToMany(mappedBy = "receiver", fetch = FetchType.LAZY)
    private java.util.List<ChatMessageEntity> receivedMessages;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private java.util.List<PaymentEntity> paymentsReceived;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private java.util.List<RepaymentEntity> repayments;
}
