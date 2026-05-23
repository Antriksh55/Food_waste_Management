package com.foodwaste.auth;

import com.foodwaste.auth.dto.LoginRequest;
import com.foodwaste.auth.dto.RegisterRequest;
import com.foodwaste.auth.entity.User;
import com.foodwaste.auth.repository.UserRepository;
import com.foodwaste.auth.security.JwtConfig;
import com.foodwaste.auth.security.JwtUtil;
import com.foodwaste.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtUtil jwtUtil;

    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtUtil);
    }

    @Test
    void register_validRequest_savesUser() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Test User");
        req.setEmail("test@example.com");
        req.setPassword("password123");
        req.setRole("NGO");
        req.setCity("Mumbai");

        User saved = User.builder()
                .id(UUID.randomUUID())
                .name(req.getName())
                .email(req.getEmail())
                .password("hashed")
                .role(req.getRole())
                .city(req.getCity())
                .active(true)
                .build();

        when(userRepository.save(any(User.class))).thenReturn(saved);

        User result = authService.register(req);

        assertNotNull(result);
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void login_invalidEmail_throwsBadCredentials() {
        LoginRequest req = new LoginRequest();
        req.setEmail("unknown@example.com");
        req.setPassword("password");

        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> authService.login(req));
    }

    @Test
    void login_inactiveUser_throwsDisabled() {
        LoginRequest req = new LoginRequest();
        req.setEmail("blocked@example.com");
        req.setPassword("password");

        User user = User.builder()
                .id(UUID.randomUUID())
                .email("blocked@example.com")
                .password(passwordEncoder.encode("password"))
                .role("NGO")
                .city("Delhi")
                .name("Blocked")
                .active(false)
                .build();

        when(userRepository.findByEmail("blocked@example.com")).thenReturn(Optional.of(user));

        assertThrows(DisabledException.class, () -> authService.login(req));
    }

    @Test
    void register_passwordIsHashed() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Hash Test");
        req.setEmail("hash@example.com");
        req.setPassword("plaintext");
        req.setRole("RESTAURANT");
        req.setCity("Chennai");

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = authService.register(req);

        assertNotEquals("plaintext", result.getPassword());
        assertTrue(passwordEncoder.matches("plaintext", result.getPassword()));
    }
}
