# Task prompt record

Author: Carlos Enrique
Role: Developer
Recorded at: 2026-10-17T17:49:05-06:00
Redaction: None required.

## Task prompt

Create a GitHub Actions workflow for running this project's backend tests.

Before making changes:
- Follow AGENTS.md and all applicable instructions.
- Complete Git preflight, validate the required author identity, and record this task.
- Inspect pom.xml, the Maven Wrapper if present, test configuration, and existing workflows.
- Run the existing tests locally and report the baseline result. If they fail, investigate and report the failure before adding the workflow.

Workflow requirements:
- Store the workflow under .github/workflows/.
- Run on pull requests targeting the repository's default branch, pushes to that branch, and manual dispatch.
- Check out the code and configure Java 17.
- Prefer the existing Maven Wrapper; otherwise use Maven.
- Cache Maven dependencies.
- Run Maven tests in non-interactive mode.
- Ensure tests do not depend on the developer's local .env, credentials, or running containers.
- Inspect whether tests use H2, mocks, or Oracle before deciding what CI requires. Do not silently skip tests or claim Oracle coverage from H2 tests.
- Upload Surefire reports on test failure.
- Use minimal workflow permissions and maintained action versions.

The Git preflight governs your work as the coding agent. Do not execute that developer preflight inside CI, where detached HEAD and default-branch builds are expected.

Keep the change focused on test automation. Do not add deployment, frontend builds, automatic commits, or pushes.

Validate the workflow and rerun relevant local tests after any configuration changes.

Report changed files, test results, configuration assumptions, and how to check the first GitHub Actions run. Clearly distinguish local validation from an actual GitHub-hosted run.
