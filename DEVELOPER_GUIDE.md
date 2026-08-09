# Developer Guide

Welcome to the TeamFlow engineering team! This guide explains our conventions, workflows, and how to safely extend the application.

## Project Structure

TeamFlow is separated into two primary directories:

- `client/`: A standard Vite + React 19 application.
- `server/`: An Express + Node.js backend.

## Coding Conventions

1. **Prettier & ESLint**: All code must conform to the defined `.prettierrc` and `.eslintrc` standards. The CI pipeline will fail if linting errors are present.
2. **Strict Modularity (Backend)**:
   - **Controllers**: NEVER put database queries or business logic here. Controllers exist only to handle HTTP `req`/`res`.
   - **Services**: All business logic goes here.
   - **Models**: Mongoose schemas only.
3. **Component Design (Frontend)**:
   - Prefer functional components and hooks.
   - Use Tailwind utility classes directly on components. Extract generic UI (buttons, modals) into `src/components/ui/`.

## Adding New Modules

When adding a new feature (e.g., `Invoices`), follow the domain pattern:

1. Create `server/models/invoice.model.js`.
2. Create `server/services/invoice.service.js`.
3. Create `server/controllers/invoice.controller.js`.
4. Create `server/routes/invoice.routes.js`.
5. Mount the route in `server/server.js` (or `api/v1/index.js`).

## Testing Workflow

Do not write code without tests. We enforce a high coverage standard.

**Backend**:
We use `Jest` combined with `mongodb-memory-server` and `supertest`.
```bash
cd server
npm run test:watch
```

**Frontend**:
We use `Vitest` and `React Testing Library`.
```bash
cd client
npm run test:watch
```

**End-to-End**:
We use `Playwright` to simulate full user journeys.
```bash
npm run test:e2e
```

## Logging

**Do NOT use `console.log` in production code.**
Always require the centralized Pino logger:

```javascript
const { logger } = require('../modules/shared/logger');

logger.info({ msg: 'Action performed', resourceId: 123 });
logger.error({ err, msg: 'Operation failed' });
```
This ensures logs are properly formatted as JSON and injected with correlation IDs (`reqId`).

## Deployment Workflow

1. Push to `main` to trigger the CI pipeline (Tests + Docker Build verifications).
2. Manually trigger the **Continuous Delivery** GitHub Action (`cd.yml`), specifying the target environment (`staging` or `production`) and the version tag (e.g., `v1.1.0`).
3. GHCR images will be built, tagged, and pushed.
4. Render/Vercel handles infrastructure routing automatically (see `deployment.md`).
