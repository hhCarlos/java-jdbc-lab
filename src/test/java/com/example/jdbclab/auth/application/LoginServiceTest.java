package com.example.jdbclab.auth.application;

import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoginServiceTest {
    private final CredentialRepository credentials = mock(CredentialRepository.class);
    private final PasswordVerifier passwords = mock(PasswordVerifier.class);
    private final TokenIssuer tokens = mock(TokenIssuer.class);
    private final LoginService service = new LoginService(credentials, passwords, tokens);

    @Test
    void matchingPasswordIssuesTokenForTheStoredUserId() {
        when(credentials.findByEmail("ana@example.test")).thenReturn(Optional.of(new UserCredentials(7L, "stored-hash")));
        when(passwords.matches("correct", "stored-hash")).thenReturn(true);
        var expected = new AccessToken("signed-token", 900);
        when(tokens.issue(7L)).thenReturn(expected);
        assertThat(service.login("ana@example.test", "correct")).isSameAs(expected);
    }

    @Test
    void unknownAccountStillPerformsPasswordVerificationAndNeverIssuesToken() {
        when(credentials.findByEmail("missing@example.test")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.login("missing@example.test", "incorrect"))
                .isInstanceOf(InvalidCredentialsException.class).hasMessage("Invalid email or password.");
        verify(passwords).matches("incorrect", null);
        verifyNoInteractions(tokens);
    }

    @Test
    void wrongPasswordUsesTheSameGenericFailureAndNeverIssuesToken() {
        when(credentials.findByEmail("ana@example.test")).thenReturn(Optional.of(new UserCredentials(7L, "stored-hash")));
        when(passwords.matches("incorrect", "stored-hash")).thenReturn(false);
        assertThatThrownBy(() -> service.login("ana@example.test", "incorrect"))
                .isInstanceOf(InvalidCredentialsException.class).hasMessage("Invalid email or password.");
        verifyNoInteractions(tokens);
    }
}
