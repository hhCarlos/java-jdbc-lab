package com.example.jdbclab.infrastructure.configuration;

import com.example.jdbclab.users.infrastructure.configuration.DevDatabaseConfiguration;
import com.example.jdbclab.users.infrastructure.database.DevelopmentDatabaseReset;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RuntimeProfilesTest {
    private final DataSource dataSource = mock(DataSource.class);
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().getPropertySources()
                    .remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME))
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withUserConfiguration(RuntimeProfileConfiguration.class, DevDatabaseConfiguration.class)
            .withBean(DataSource.class, () -> dataSource);

    @Test
    void devUsesLocalSchemaAndDefaultsResetToFalse() {
        runner.withPropertyValues("spring.profiles.active=dev", "DB_PASSWORD=local-test-secret")
                .run(context -> {
                    assertThat(context).hasNotFailed().doesNotHaveBean(DevelopmentDatabaseReset.class);
                    assertThat(context.getEnvironment().getProperty("spring.datasource.url"))
                            .isEqualTo("jdbc:oracle:thin:@//localhost:1521/FREEPDB1");
                    assertThat(context.getEnvironment().getProperty("spring.datasource.username"))
                            .isEqualTo("store_jdbc");
                    assertThat(context.getEnvironment().getProperty("app.dev-db-reset", Boolean.class)).isFalse();
                    assertThat(context.getEnvironment().getProperty("spring.sql.init.mode")).isEqualTo("never");
                    assertThat(context.getEnvironment().getProperty("springdoc.api-docs.enabled", Boolean.class)).isTrue();
                    assertThat(context.getEnvironment().getProperty("springdoc.swagger-ui.enabled", Boolean.class)).isTrue();
                    verifyNoInteractions(dataSource);
                });
    }

    @Test
    void explicitDevResetRegistersRunnerWithoutExecutingItInThisTest() {
        runner.withPropertyValues("spring.profiles.active=dev", "DEV_DB_RESET=true")
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(DevelopmentDatabaseReset.class);
                    verifyNoInteractions(dataSource);
                });
    }

    @Test
    void prodUsesOnlyProductionSettingsAndExcludesResetEvenWhenRequested() {
        runner.withPropertyValues("spring.profiles.active=prod", "DEV_DB_RESET=true",
                        "app.dev-db-reset=true", "DB_URL=jdbc:oracle:thin:@//localhost:1521/FREEPDB1",
                        "DB_USERNAME=store_jdbc", "DB_PASSWORD=development-secret",
                        "PROD_DB_URL=jdbc:oracle:thin:@//production.example:1521/PRODPDB",
                        "PROD_DB_USERNAME=production_schema", "PROD_DB_PASSWORD=production-secret")
                .run(context -> {
                    assertThat(context).hasNotFailed().doesNotHaveBean(DevelopmentDatabaseReset.class);
                    var environment = context.getEnvironment();
                    assertThat(environment.getProperty("spring.datasource.url"))
                            .isEqualTo("jdbc:oracle:thin:@//production.example:1521/PRODPDB");
                    assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("production_schema");
                    assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("production-secret");
                    assertThat(environment.getProperty("spring.sql.init.mode")).isEqualTo("never");
                    assertThat(environment.getProperty("springdoc.api-docs.enabled", Boolean.class)).isFalse();
                    assertThat(environment.getProperty("springdoc.swagger-ui.enabled", Boolean.class)).isFalse();
                    verifyNoInteractions(dataSource);
                });
    }

    @Test
    void prodIgnoresResetEnvironmentFlag() {
        runner.withPropertyValues("spring.profiles.active=prod", "DEV_DB_RESET=true",
                        "PROD_DB_URL=jdbc:oracle:thin:@//production.example:1521/PRODPDB",
                        "PROD_DB_USERNAME=production_schema", "PROD_DB_PASSWORD=production-secret")
                .run(context -> {
                    assertThat(context).hasNotFailed().doesNotHaveBean(DevelopmentDatabaseReset.class);
                    assertThat(context.getEnvironment().getProperty("app.dev-db-reset", Boolean.class)).isFalse();
                    verifyNoInteractions(dataSource);
                });
    }

    @Test
    void prodRejectsEveryMissingOrBlankProductionSettingWithoutDevFallback() {
        String[] keys = {"PROD_DB_URL", "PROD_DB_USERNAME", "PROD_DB_PASSWORD"};
        for (String missing : keys) {
            for (String absentOrBlank : new String[]{null, ""}) {
                ApplicationContextRunner candidate = runner.withPropertyValues("spring.profiles.active=prod",
                        "DB_URL=jdbc:oracle:thin:@//localhost:1521/FREEPDB1", "DB_USERNAME=store_jdbc",
                        "DB_PASSWORD=development-secret");
                for (String key : keys) {
                    if (!key.equals(missing)) {
                        candidate = candidate.withPropertyValues(key + "=test-production-value");
                    } else if (absentOrBlank != null) {
                        candidate = candidate.withPropertyValues(key + "=");
                    }
                }
                candidate.run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure()).hasMessageContaining("Production requires " + missing);
                    verifyNoInteractions(dataSource);
                });
            }
        }
    }

    @Test
    void rejectsDevAndProdInEitherOrderBeforeAccessingDatabase() {
        for (String profiles : new String[]{"dev,prod", "prod,dev"}) {
            runner.withPropertyValues("spring.profiles.active=" + profiles, "DEV_DB_RESET=true")
                    .run(context -> {
                        assertThat(context).hasFailed();
                        assertThat(context.getStartupFailure()).hasMessageContaining("dev and prod cannot be active together");
                        verifyNoInteractions(dataSource);
                    });
        }
    }
}
