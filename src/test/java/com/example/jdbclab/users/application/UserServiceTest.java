package com.example.jdbclab.users.application;

import com.example.jdbclab.users.domain.User;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {
    private final UserRepository repository = mock(UserRepository.class);
    private final UserService service = new UserService(repository);
    private final User user = new User(7L, "Ana", "Lopez", "ana@example.test",
            OffsetDateTime.parse("2026-10-15T10:00:00-06:00"),
            OffsetDateTime.parse("2026-10-15T11:00:00-06:00"));

    @Test
    void returnsUsersFromRepository() {
        when(repository.findAll()).thenReturn(List.of(user));
        assertThat(service.findAll()).containsExactly(user);
    }

    @Test
    void returnsEmptyListWhenNoUsersExist() {
        when(repository.findAll()).thenReturn(List.of());
        assertThat(service.findAll()).isEmpty();
    }

    @Test
    void returnsFoundUser() {
        when(repository.findById(7L)).thenReturn(Optional.of(user));
        assertThat(service.findById(7L)).isEqualTo(user);
        verify(repository).findById(7L);
    }

    @Test
    void raisesApplicationExceptionForMissingUser() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findById(99L))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessage("User with id 99 was not found.");
    }
}
