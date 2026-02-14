package com.futurevest.application.port.out;

import com.futurevest.domain.entity.User;

import java.util.Optional;
import java.util.UUID;

/**
 * Outbound port - persistence contract for domain.
 */
public interface UserRepository {

    Optional<User> findById(UUID id);

    Optional<User> findByEmail(String email);

    User save(User user);
}
