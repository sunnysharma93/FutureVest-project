package com.futurevest.infrastructure.persistence.adapter;

import com.futurevest.application.port.out.UserRepository;
import com.futurevest.domain.entity.User;
import com.futurevest.infrastructure.persistence.entity.UserEntity;
import com.futurevest.infrastructure.persistence.repository.UserJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepository {

    private final UserJpaRepository jpaRepository;

    @Override
    public Optional<User> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email).map(this::toDomain);
    }

    @Override
    public User save(User user) {
        UserEntity entity = toEntity(user);
        UserEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }

    private User toDomain(UserEntity e) {
        return User.builder()
                .id(e.getId())
                .email(e.getEmail())
                .passwordHash(e.getPasswordHash())
                .displayName(e.getDisplayName())
                .enabled(e.isEnabled())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    private UserEntity toEntity(User u) {
        return UserEntity.builder()
                .id(u.getId())
                .email(u.getEmail())
                .passwordHash(u.getPasswordHash())
                .displayName(u.getDisplayName())
                .enabled(u.isEnabled())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
