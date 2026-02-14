package com.futurevest.application.port.in;

import com.futurevest.domain.entity.User;

import java.util.Optional;
import java.util.UUID;

/**
 * Inbound port (use case) - application service interface.
 */
public interface GetUserUseCase {

    Optional<User> getById(UUID id);

    Optional<User> getByEmail(String email);
}
