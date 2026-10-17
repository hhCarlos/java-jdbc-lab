package com.example.jdbclab;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Lightweight checks for the chosen boundaries, without another architecture dependency. */
class ArchitectureTest {
    private static final Path ROOT = Path.of("src/main/java");
    private static final String BASE = "com.example.jdbclab.";
    private static final Pattern PACKAGE = Pattern.compile("(?m)^package ([\\w.]+);");
    private static final Pattern IMPORT = Pattern.compile("(?m)^import (?:static )?([\\w.*]+);");

    private List<Path> sources() throws IOException {
        try (var paths = Files.walk(ROOT)) {
            return paths.filter(path -> path.toString().endsWith(".java")).toList();
        }
    }

    private String packageOf(String source) {
        var match = PACKAGE.matcher(source);
        assertThat(match.find()).isTrue();
        return match.group(1);
    }

    @Test
    void sourcePathsMatchTheirFeaturePackages() throws IOException {
        for (var path : sources()) {
            String name = packageOf(Files.readString(path));
            assertThat(path.getParent()).isEqualTo(ROOT.resolve(name.replace('.', '/')));
            assertThat(name).doesNotStartWith(BASE + "application").doesNotStartWith(BASE + "domain");
        }
    }

    @Test
    void domainAndApplicationDependOnlyOnJavaAndAllowedInnerLayers() throws IOException {
        for (var path : sources()) {
            String source = Files.readString(path);
            String name = packageOf(source);
            boolean domain = name.contains(".domain");
            if (!domain && !name.contains(".application")) continue;
            String feature = name.substring(BASE.length()).split("\\.")[0];
            var imports = IMPORT.matcher(source);
            while (imports.find()) {
                String dependency = imports.group(1);
                boolean allowed = (dependency.startsWith("java.")
                        && !dependency.startsWith("java.sql.") && !dependency.startsWith("java.net.http."))
                        || dependency.startsWith(BASE + feature + ".domain.")
                        || (!domain && dependency.startsWith(BASE + feature + ".application."))
                        || (!domain && feature.equals("auth") &&
                            (dependency.startsWith(BASE + "users.domain.")
                             || dependency.startsWith(BASE + "users.application.")));
                assertThat(allowed).as("%s imports %s", path, dependency).isTrue();
            }
        }
    }

    @Test
    void featuresDoNotImportCompositionOrAnotherFeaturesInfrastructure() throws IOException {
        for (var path : sources()) {
            String source = Files.readString(path);
            String name = packageOf(source);
            if (!name.startsWith(BASE + "users.") && !name.startsWith(BASE + "auth.")) continue;
            String feature = name.substring(BASE.length()).split("\\.")[0];
            var imports = IMPORT.matcher(source);
            while (imports.find()) {
                String dependency = imports.group(1);
                assertThat(dependency).doesNotStartWith(BASE + "infrastructure.");
                if (feature.equals("users")) {
                    // Auth depends on users; prohibiting the reverse edge prevents feature cycles.
                    assertThat(dependency).doesNotStartWith(BASE + "auth.");
                } else {
                    assertThat(dependency).doesNotStartWith(BASE + "users.infrastructure.");
                }
            }
        }
    }
}
