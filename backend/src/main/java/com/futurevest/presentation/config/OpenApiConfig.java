package com.futurevest.presentation.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI futurevestOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FutureVest API")
                        .description("FutureVest Backend API - Education funding platform connecting students with investors")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("FutureVest Team")
                                .email("support@futurevest.com")
                                .url("https://futurevest.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080/api/v1")
                                .description("Development Server"),
                        new Server()
                                .url("https://api.futurevest.com/api/v1")
                                .description("Production Server")
                ))
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT Authentication token")))
                .addSecurityItem(new SecurityRequirement()
                        .addList("bearer-jwt"));
    }
}
