package com.futurevest;

import com.futurevest.presentation.security.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@EnableJpaAuditing
@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class FutureVestApplication {

    public static void main(String[] args) {
        SpringApplication.run(FutureVestApplication.class, args);
    }
}
