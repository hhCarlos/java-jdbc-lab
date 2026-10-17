package com.example.jdbclab.auth.application;

import com.example.jdbclab.users.application.EmailAlreadyExistsException;
import com.example.jdbclab.users.application.RegistrationRepository;
import com.example.jdbclab.users.domain.User;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class RegistrationServiceTest {
    private final RegistrationRepository users = mock(RegistrationRepository.class);
    private final PasswordHasher passwords = mock(PasswordHasher.class);
    private final RegistrationService registration = new RegistrationService(users, passwords);

    @Test
    void hashesTheUnmodifiedPasswordAndPersistsCanonicalEmail() {
        String password = "  preserve surrounding spaces  ";
        var expected = new User(8L, "Ana", "Lopez", "ana@example.test", null, null);
        when(passwords.hash(password)).thenReturn("stored-hash");
        when(users.insert("Ana", "Lopez", "ana@example.test", "stored-hash")).thenReturn(expected);
        assertThat(registration.register("Ana", "Lopez", " ANA@Example.Test ", password)).isSameAs(expected);
        verify(users).emailExists("ana@example.test");
        verify(passwords).hash(password);
    }

    @Test
    void knownDuplicateDoesNotHashOrInsert() {
        when(users.emailExists("ana@example.test")).thenReturn(true);
        assertThatThrownBy(() -> registration.register("Ana", "Lopez", " ANA@EXAMPLE.TEST ", "password"))
                .isInstanceOf(EmailAlreadyExistsException.class);
        verifyNoInteractions(passwords);
        verify(users, never()).insert(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void concurrentDatabaseConflictRemainsADuplicateFailure() {
        when(passwords.hash("password")).thenReturn("hash");
        when(users.insert("Ana", "Lopez", "ana@example.test", "hash"))
                .thenThrow(new EmailAlreadyExistsException());
        assertThatThrownBy(() -> registration.register("Ana", "Lopez", "ana@example.test", "password"))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }
}
