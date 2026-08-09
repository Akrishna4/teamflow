# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-09

### Added
- **My Tasks Dashboard**: A personalized, Kanban-style dashboard categorizing tasks by Assigned, Pending, Overdue, and Completed.
- **Onboarding Demo Seeder**: Automatically injects a realistic set of software engineering tasks into the workspace of newly registered users. Ensures idempotency via atomic MongoDB locks.
- **Real-Time Synchronization**: Full Socket.IO integration to broadcast task creation, updates, and deletions instantly to connected clients within private user rooms.
- **Swagger Documentation**: Live OpenAPI specification exposed at `/api/docs`.
- **Global Search**: `Meta+K` command palette allowing cross-project task lookup.
- **CI/CD Pipeline**: GitHub Actions workflows configured for linting, testing, and Docker builds.

### Changed
- **Database Projections**: Drastically improved backend performance by migrating heavy dashboard aggregations to parallel `.find().lean()` queries with exact `.select()` projections.
- **UI Aesthetics**: Polished Tailwind styling to align with industry-standard project management aesthetics (similar to Jira and Linear), including empty states and micro-interactions.
- **Socket Efficiency**: Debounced React socket event listeners to prevent API spamming during bulk updates.

### Fixed
- Fixed critical race conditions in the Demo Seeder using atomic `findOneAndUpdate`.
- Eliminated redundant component re-renders using `useMemo` and strict React dependency arrays.
- Cleaned up obsolete imports and debug scripts from the repository.

### Security
- Introduced standard `SECURITY.md` and `LICENSE` health files.
- Enforced strict authorization checks on all dashboard queries to prevent cross-tenant data leakage.
