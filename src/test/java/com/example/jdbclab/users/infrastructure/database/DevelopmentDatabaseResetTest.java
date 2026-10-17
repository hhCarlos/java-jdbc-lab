package com.example.jdbclab.users.infrastructure.database;

import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.OffsetDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DevelopmentDatabaseResetTest {
    private final DataSource source = mock(DataSource.class);
    private final Connection connection = mock(Connection.class);
    private final DatabaseMetaData metadata = mock(DatabaseMetaData.class);
    private final Statement statement = mock(Statement.class);
    private final PreparedStatement insert = mock(PreparedStatement.class);
    private final MockEnvironment environment = new MockEnvironment();

    @BeforeEach
    void setUp() throws Exception {
        environment.setActiveProfiles("dev");
        environment.setProperty("app.dev-db-reset", "true");
        when(source.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getURL()).thenReturn("jdbc:oracle:thin:@//localhost:1521/FREEPDB1");
        when(metadata.getDatabaseProductName()).thenReturn("Oracle");
        when(metadata.getUserName()).thenReturn("STORE_JDBC");
        when(connection.createStatement()).thenReturn(statement);
        when(connection.prepareStatement(anyString())).thenReturn(insert);
        when(insert.executeUpdate()).thenReturn(1);
        sessionIdentity("STORE_JDBC:STORE_JDBC:FREEPDB1");
    }

    private void sessionIdentity(String identity) throws Exception {
        ResultSet result = mock(ResultSet.class);
        ResultSetMetaData resultMetadata = mock(ResultSetMetaData.class);
        when(statement.executeQuery(anyString())).thenReturn(result);
        when(result.next()).thenReturn(true, false);
        when(result.getMetaData()).thenReturn(resultMetadata);
        when(resultMetadata.getColumnCount()).thenReturn(1);
        when(result.getString(1)).thenReturn(identity);
    }

    private DevelopmentDatabaseReset reset() {
        return new DevelopmentDatabaseReset(source, environment);
    }

    @Test
    void rejectsProdMixedProfilesMissingDevOrDisabledFlagBeforeOpeningConnection() throws Exception {
        for (String[] profiles : List.of(new String[]{"prod"}, new String[]{"dev", "prod"}, new String[]{})) {
            environment.setActiveProfiles(profiles);
            assertThatThrownBy(() -> reset().run(null)).isInstanceOf(IllegalStateException.class);
        }
        environment.setActiveProfiles("dev");
        environment.setProperty("app.dev-db-reset", "false");
        assertThatThrownBy(() -> reset().run(null)).isInstanceOf(IllegalStateException.class);
        verify(source, never()).getConnection();
    }

    @Test
    void rejectsRemoteOrUnexpectedDatabaseBeforeExecutingSql() throws Exception {
        for (String url : List.of("jdbc:oracle:thin:@//remote.example:1521/FREEPDB1",
                "jdbc:oracle:thin:@//localhost:1521/OTHER", "jdbc:h2:mem:test")) {
            when(metadata.getURL()).thenReturn(url);
            assertThatThrownBy(() -> reset().run(null)).isInstanceOf(IllegalStateException.class);
        }
        verify(connection, never()).createStatement();
    }

    @Test
    void rejectsUnexpectedConnectionUserBeforeExecutingSql() throws Exception {
        when(metadata.getUserName()).thenReturn("SYSTEM");
        assertThatThrownBy(() -> reset().run(null)).isInstanceOf(IllegalStateException.class);
        verify(connection, never()).createStatement();
    }

    @Test
    void rejectsUnexpectedCurrentSchemaOrPdbBeforeAnyDdl() throws Exception {
        sessionIdentity("STORE_JDBC:OTHER_SCHEMA:FREEPDB1");
        assertThatThrownBy(() -> reset().run(null)).isInstanceOf(IllegalStateException.class);
        verify(statement, never()).execute(anyString());
        verify(connection, never()).prepareStatement(anyString());
    }

    @Test
    void resetsOnlyKnownTablesReusesCanonicalDdlAndSeedsDeterministicHashes() throws Exception {
        reset().run(null);
        String ddl = new ClassPathResource("db/tables/users.sql").getContentAsString(StandardCharsets.UTF_8)
                .strip().replaceFirst(";\\s*$", "");
        String[] productsDdl = new ClassPathResource("db/tables/products.sql")
                .getContentAsString(StandardCharsets.UTF_8).split(";");
        var order = inOrder(statement, connection);
        order.verify(statement).execute("DROP TABLE STORE_JDBC.PRODUCTS PURGE");
        order.verify(statement).execute("DROP TABLE STORE_JDBC.USERS PURGE");
        order.verify(statement).execute(ddl);
        order.verify(statement).execute(productsDdl[0].strip());
        order.verify(statement).execute(productsDdl[1].strip());
        order.verify(connection).setAutoCommit(false);
        order.verify(connection).commit();
        var statements = ArgumentCaptor.forClass(String.class);
        verify(statement, times(5)).execute(statements.capture());
        assertThat(statements.getAllValues()).containsExactly("DROP TABLE STORE_JDBC.PRODUCTS PURGE", "DROP TABLE STORE_JDBC.USERS PURGE",
                ddl, productsDdl[0].strip(), productsDdl[1].strip());
        var emails = ArgumentCaptor.forClass(String.class);
        verify(insert, times(2)).setString(eq(3), emails.capture());
        assertThat(emails.getAllValues()).containsExactly("ana@example.test", "luis@example.test");
        var hashes = ArgumentCaptor.forClass(String.class);
        verify(insert, times(2)).setString(eq(4), hashes.capture());
        assertThat(hashes.getAllValues()).allSatisfy(hash ->
                assertThat(hash).matches("pbkdf2-sha256\\$600000\\$[A-Za-z0-9+/=]+\\$[A-Za-z0-9+/=]+"));
        var timestamp = OffsetDateTime.parse("2026-01-01T00:00:00Z");
        verify(insert, times(2)).setObject(5, timestamp);
        verify(insert, times(2)).setObject(6, timestamp);
        verify(insert, times(2)).executeUpdate();
        verify(connection, never()).rollback();
    }

    @Test
    void createsTableWhenDropReportsMissingTable() throws Exception {
        when(statement.execute("DROP TABLE STORE_JDBC.USERS PURGE"))
                .thenThrow(new SQLException("missing", "42000", 942));
        reset().run(null);
        verify(insert, times(2)).executeUpdate();
        verify(connection).commit();
    }

    @Test
    void doesNotIgnoreOtherDropErrorsOrSeedAfterFailure() throws Exception {
        when(statement.execute("DROP TABLE STORE_JDBC.USERS PURGE"))
                .thenThrow(new SQLException("insufficient privileges", "42000", 1031));
        assertThatThrownBy(() -> reset().run(null)).isInstanceOf(SQLException.class);
        verify(statement, times(2)).execute(anyString());
        verify(connection, never()).prepareStatement(anyString());
    }

    @Test
    void rollsBackSeedFailureAndFailsStartup() throws Exception {
        when(insert.executeUpdate()).thenThrow(new SQLException("seed failure"));
        assertThatThrownBy(() -> reset().run(null)).isInstanceOf(RuntimeException.class);
        verify(connection).rollback();
        verify(connection, never()).commit();
    }

    @Test
    void rollsBackWhenSeedCommitFails() throws Exception {
        doThrow(new SQLException("commit failure")).when(connection).commit();
        assertThatThrownBy(() -> reset().run(null)).isInstanceOf(SQLException.class);
        verify(connection).rollback();
    }
}
