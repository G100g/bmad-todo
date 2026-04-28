# Product Brief: bmad-todo

**Date:** April 28, 2026
**Author:** Giorgio

## Overview

**bmad-todo** is a production-ready task management web application built as a high-quality technical showcase. It implements standard CRUD operations for to-do tasks using a modern full-stack architecture: a React Single Page Application (SPA) frontend and a Fastify REST API backend, supported by a local SQLite database.

This project is not just another simple to-do app; it is engineered to be an exhaustive demonstration of senior-level development practices, focusing heavily on code quality, comprehensive test coverage, and modern, flawless containerized deployment.

## Target Audience

1. **The Evaluator (Hiring Managers / Technical Reviewers):** The primary audience. They are looking for code quality, strict architectural standards, testing rigor, and seamless local deployment.
2. **The Everyday User:** The theoretical end-user expecting a fast, responsive, and accessible UI.
3. **The Developer/Maintainer:** The persona maintaining the code, requiring clear documentation, solid test coverage, and organized CI/CD-ready infrastructure.

## Key Value Proposition (The "Why")

Most portfolio projects are fundamentally broken, lack tests, or require complicated setups. **bmad-todo** stands out through:

- **Flawless Portability:** Runs seamlessly via a single `docker-compose up` command with proper health checks ensuring deterministic startup.
- **Engineering Rigor:** Demonstrates clean architecture, strict separation of concerns, and robust testing practices.
- **Verifiable Quality:** Includes generated QA reports proving 70%+ test coverage, automated accessibility checks, and security scans with zero critical vulnerabilities.

## Core MVP Scope (What are we building first?)

- **Frontend:** A React SPA (TypeScript) using a modern UI kit. Supports full standard CRUD for tasks (Create, Read, Update, Delete) and features baseline accessibility (keyboard navigation).
- **Backend:** A Fastify REST API server managing standard JSON request/response payloads.
- **Database:** Local SQLite, isolated per container instance for the showcase.
- **Infrastructure:** Fully containerized. A `Dockerfile` for each service, unified by a `docker-compose.yml` with proper backend health checks.
- **QA & Documentation:** Comprehensive Unit, Integration, and E2E test suites aiming for 70% coverage, coupled with static QA reports and BMAD architectural documentation.

## Success Criteria

- **Time-to-run:** < 3 minutes from repository clone to a fully running application via Docker Compose, with zero configuration errors.
- **Testing:** 70% minimum test coverage across all suites, documented via generated reports.
- **Quality & Security:** Zero critical/high security vulnerabilities and zero a11y failures on core UI elements.
- **Business Goal:** Serves as a definitive technical portfolio piece that immediately establishes senior-level engineering credibility.

---

_Note: This is an executive summary extracted from the comprehensive Product Requirements Document (PRD)._
