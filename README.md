# bmad-todo

A full-stack todo application built with React (frontend) and Fastify (backend), fully containerized for single-command startup.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose (no other system dependencies required)

## Quick Start

```bash
docker compose up
```

That's it. The entire stack — backend API, SQLite database, and frontend — starts with a single command.

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3000 |

The frontend will only start after the backend is healthy. Allow 30-60 seconds on first run while Docker builds the images.

## Docker Profiles and Environments

The default stack starts optimized runtime containers (`backend` + `frontend`).

Optional profiles:

```bash
# Frontend Vite dev server on http://localhost:5174
docker compose --profile dev up

# Test backend container wiring
docker compose --profile test up backend-test
```

Environment variables are loaded from your shell or `.env` file. See `.env.example` for supported values.

## Health and Logs

Health endpoints:

- Backend: `GET /health`
- Frontend container: `GET /healthz`

Useful commands:

```bash
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
```

> **Tip:** If you make frontend changes and they don't appear, Docker layer caching may serve a stale image. Rebuild with:
>
> ```bash
> docker compose build --no-cache frontend && docker compose up
> ```

## Running Tests

### Backend unit / integration tests

Requires Node.js installed locally (or you can run `npm test` inside the backend container):

```bash
cd backend && npm test
```

### E2E tests (Playwright)

Requires the Docker stack to be running (`docker compose up`), then from the repo root:

```bash
npm run test:e2e
```

## Project Structure

```
bmad-todo/
├── frontend/        # React + Vite UI (served on :5173)
├── backend/         # Fastify REST API (served on :3000)
├── e2e/             # Playwright end-to-end tests
├── data/            # Persisted SQLite database (mounted into backend container)
└── docker-compose.yml
```

## Quality Reports

Generate a full quality report (coverage, security, accessibility) with a single command:

```bash
# Docker stack must be running for accessibility checks
docker compose up -d

npm run quality-report
```

Reports are saved to `_bmad-output/qa-reports/`:

| Report                     | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `quality-report.json`      | Aggregated summary — start here                 |
| `backend-coverage.json`    | Backend c8 coverage (threshold: 70%)            |
| `frontend-coverage.json`   | Frontend Vitest coverage (threshold: 70%)       |
| `e2e-test-report.json`     | Playwright E2E pass/fail summary                |
| `security-audit.json`      | `npm audit` results (zero Critical/High policy) |
| `accessibility-audit.json` | axe-core WCAG AA audit results                  |

See [`_bmad-output/qa-reports/README.md`](_bmad-output/qa-reports/README.md) for full details on each report.

### Frontend unit tests

```bash
cd frontend && npm test          # run tests
cd frontend && npm run test:coverage  # run with coverage
```

## BMAD Method & AI Experience

This project was built following the [BMAD](https://github.com/bmadcode/bmad-method) methodology, using GitHub Copilot inside VS Code. Here are my reflections on the process.

### Agent Usage

I primarily alternated between Claude Sonnet 4.6 and Gemini 2.5 Pro. Both performed well on code writing and review with no significant differences. For documentation, I leaned on Gemini 2.5 Pro and Copilot's auto mode — Gemini handled context better there, maintaining a clearer vision of the overall document structure. I also delegated one full user story to auto mode; that was the lowest-quality output, requiring the most human intervention.

### MCP Server Usage

No MCP servers were used in this project.

### Test Generation

Test generation was generally excellent. At one point — likely due to auto mode losing context — the AI produced two nearly identical test suites instead of consolidating them. A different model or closer human oversight would probably have caught that duplication earlier.

### Debugging with AI

The AI handled development and debugging autonomously throughout the project. When issues arose, it identified and resolved them without requiring manual intervention.

### Limitations Encountered

Human guidance remains necessary to prevent the AI from going in circles or producing redundant work. A more thorough upfront review of the generated documentation would likely have improved overall quality.

The BMAD approach is notably verbose: the bulk of the effort went into generating planning and documentation artifacts rather than writing application code. For a simple todo app this felt heavy — it is hard to imagine the overhead for a genuinely complex application.

By comparison, I found [spec-kit](https://github.com/speckit) in another personal project to be far more satisfying and immediate, delivering equally solid results with considerably less ceremony.
