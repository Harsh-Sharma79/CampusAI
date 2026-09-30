# CampusAI

**Your AI Academic Copilot** — a responsive frontend prototype that helps a student understand what they know, identify learning gaps, practice, and decide what to study next.

## Run locally

Requirements: Node.js 20.11+ and npm 10+.

```bash
npm install
npm run dev
```

The Vite dev server listens on `http://localhost:3000`. For a static production build, run `npm run build`; output is written to `dist/`. `npm run preview` serves that build on port 3000.

Copy `.env.example` to `.env` only if you want to customize the non-secret demo label. **Never put secret keys in `VITE_*` variables.**

## Demo account and features

The app opens with sample learning data for Alex Morgan (University of Example, B.Tech Computer Science, semester 6). It includes the marketing site, demo login/signup and onboarding, learning dashboard, mock AI tutor, materials/upload simulation, knowledge map, quiz builder and results, flashcards, planner, progress analytics, settings and profile. Use **⌘/Ctrl + K** to open the command palette; theme can be changed from the top bar or settings.

All service functions in `src/services/` are asynchronous mocks. Chat answers, signup/login, uploads, quiz generation and analysis do not call a backend; file bytes are not uploaded or stored. Persistent demo preferences and selected planner state are kept in browser localStorage. Do not enter real credentials or sensitive student information.

## Architecture

- `src/app`: lazy route definitions and application shell
- `src/pages`: landing/auth, dashboard, tutor, material, quiz, flashcard, planner, analytics, settings and profile screens
- `src/components`: shared primitives and reusable product components
- `src/context`: theme, demo account and toast state
- `src/data` + `src/types`: typed seed data and domain contracts
- `src/services`: mock API boundary, designed for future REST replacement
- `src/styles`: Tailwind entry, palette tokens, responsive patterns and reduced-motion rules
- `public/manus-routes.json`: source-of-truth route manifest; keep it updated when pages change

This project intentionally has **no backend, real authentication, remote AI provider, database or durable upload storage**. A production integration should replace the service implementations and validate its API contracts before collecting real student data.
