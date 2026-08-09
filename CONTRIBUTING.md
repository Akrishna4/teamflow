# Contributing to TeamFlow

Thank you for your interest in contributing to TeamFlow! To ensure a smooth collaboration process, please follow the guidelines outlined below.

## Branch Strategy

TeamFlow uses a trunk-based branching strategy:

- `main`: The stable, production-ready branch. Do not push directly to this branch.
- Feature branches: Created off `main`, named descriptively:
  - `feat/add-new-search-filter`
  - `fix/resolve-socket-memory-leak`
  - `docs/update-api-guide`
  - `chore/update-dependencies`

## Commit Message Conventions

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification. This allows us to auto-generate changelogs and version bumps.

Format:
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Examples:
- `feat(tasks): implement sub-checklists`
- `fix(auth): resolve JWT expiration crash`
- `docs(api): update swagger schemas`

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

## Pull Request Checklist

Before submitting a Pull Request, verify the following:

- [ ] My code follows the project's style guidelines (`npm run lint`).
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] New and existing tests pass locally (`npm test`).
- [ ] The CI pipeline on GitHub Actions reports success.

## Code Review Guidelines

- **Reviewers**: Focus on architectural integrity, security (RBAC checks), and performance (N+1 query avoidance).
- **Submitters**: Be receptive to feedback. Do not take critiques personally; the goal is to maintain the highest quality standard for the application.
