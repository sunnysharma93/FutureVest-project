package com.futurevest.infrastructure.persistence;

import com.futurevest.infrastructure.persistence.entity.*;
import com.futurevest.infrastructure.persistence.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Seeds example data when running with dev profile. Not run in production.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DevDataSeeder {

    private final UserJpaRepository userRepository;
    private final InvestorJpaRepository investorRepository;
    private final CourseJpaRepository courseRepository;
    private final JobJpaRepository jobRepository;
    private final ChatMessageJpaRepository chatMessageRepository;
    private final PaymentJpaRepository paymentRepository;
    private final RepaymentJpaRepository repaymentRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        if (userRepository.count() > 0) {
            log.debug("Dev data already present, skipping seed.");
            return;
        }
        log.info("Seeding dev data...");

        UserEntity user1 = userRepository.save(UserEntity.builder()
                .id(UUID.randomUUID())
                .name("Alice Doe")
                .email("alice@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(UserRole.USER)
                .resumeUrl("https://bucket.s3.amazonaws.com/resumes/alice.pdf")
                .enabled(true)
                .build());

        UserEntity user2 = userRepository.save(UserEntity.builder()
                .id(UUID.randomUUID())
                .name("Bob Smith")
                .email("bob@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role(UserRole.USER)
                .enabled(true)
                .build());

        InvestorEntity investor1 = investorRepository.save(InvestorEntity.builder()
                .id(UUID.randomUUID())
                .name("Carol Investor")
                .email("carol@investor.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .enabled(true)
                .build());

        courseRepository.save(CourseEntity.builder()
                .id(UUID.randomUUID())
                .name("Full Stack Development")
                .provider("FutureVest Academy")
                .price(new BigDecimal("9999.00"))
                .build());

        courseRepository.save(CourseEntity.builder()
                .id(UUID.randomUUID())
                .name("Data Science Fundamentals")
                .provider("FutureVest Academy")
                .price(new BigDecimal("14999.00"))
                .build());

        jobRepository.save(JobEntity.builder()
                .id(UUID.randomUUID())
                .company("Tech Corp")
                .title("Software Engineer")
                .description("Build scalable backend services.")
                .salary(new BigDecimal("1200000.00"))
                .build());

        jobRepository.save(JobEntity.builder()
                .id(UUID.randomUUID())
                .company("StartupXYZ")
                .title("Frontend Developer")
                .description("React and TypeScript.")
                .salary(new BigDecimal("800000.00"))
                .build());

        chatMessageRepository.save(ChatMessageEntity.builder()
                .id(UUID.randomUUID())
                .sender(user1)
                .receiver(user2)
                .content("Hi Bob, interested in the course?")
                .timestamp(Instant.now())
                .build());

        paymentRepository.save(PaymentEntity.builder()
                .id(UUID.randomUUID())
                .user(user1)
                .investor(investor1)
                .amount(new BigDecimal("50000.00"))
                .status(PaymentStatus.COMPLETED)
                .razorpayOrderId("order_dev_001")
                .build());

        repaymentRepository.save(RepaymentEntity.builder()
                .id(UUID.randomUUID())
                .user(user1)
                .investor(investor1)
                .amount(new BigDecimal("55000.00"))
                .dueDate(LocalDate.now().plusMonths(6))
                .status(RepaymentStatus.PENDING)
                .build());

        log.info("Dev data seeded: users=2, investors=1, courses=2, jobs=2, chats=1, payments=1, repayments=1");
    }
}
