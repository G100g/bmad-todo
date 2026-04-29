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

The frontend will only start after the backend is healthy (health-checked via `curl`). Allow 30–60 seconds on first run while Docker builds the images.

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
