# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep UI in `octofit-tracker/frontend/src` with React 19/Vite/Router/Bootstrap. Use `src/api/client.ts` for all `/api` requests (relative paths via Vite proxy, optional `VITE_API_BASE_URL`) and implement each capability view (`Activities`, `Teams`, `Leaderboard`, `Workouts`) with accessible loading (`role="status"`), empty, success, and error (`role="alert"`) states that render contract-shaped API data.
- Logic tier decision: Keep Express routes thin in `src/routes/api.ts` under `/api/*` and put validation/business behavior in explicit service functions in `src/services/octofitService.ts`. Return deliberate 4xx responses for invalid input, malformed/missing IDs, missing references, or unknown users (never 500 from cast/validation plumbing), using the existing app error handler for consistent JSON errors.
- Data tier decision: Define required fields, defaults, and refs in Mongoose schemas (`User`, `Team`, `Activity`, `Workout`) and keep `models/index.ts` exports/shared DB config (`src/config/database.ts`, `src/config/urls.ts`) as the single connection/config path. Keep `src/scripts/seed.ts` idempotent with upserts, without clearing collections, and reconcile a demo user's previous team membership when moved.
- Activity tracking approach: `POST /api/activities` accepts `userId`, `teamId`, `type`, `minutes`; validate payload and ObjectId format, verify referenced user/team exist, compute `points` from minutes, set `occurredAt`, and persist/return the stored `user`, `team`, `type`, `minutes`, `points`, `occurredAt`. Invalid/missing/malformed data or missing references return 4xx. `GET /api/activities` lists created activities.
- Team management approach: `POST /api/teams` requires `name` (400 when missing) and accepts `mascot`/`members`, creating a team that preserves submitted `name` and `mascot`. `GET /api/teams` returns teams with their members; member linkage stays consistent with schema/service expectations.
- Leaderboard approach: `GET /api/leaderboard` aggregates total activity points per team, orders entries by `totalPoints` descending, and returns each entry as `{ teamName, totalPoints, rank }` with 1-based ranks.
- Workout suggestions approach: `GET /api/workouts/suggestions/:userEmail` looks up the seeded/matching user by email and returns a deliberate 4xx (e.g. 404) when no user matches. Determine focus from the user's `fitnessGoal` and/or recent activity pattern, select matching workout suggestions (with `focus`, `minutes`, `difficulty` metadata as applicable), and include a `reason` explaining the match (e.g. run/endurance/strength activity).

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` (run 2026-11-24) — **4 failed / 1 passed** in `tests/data.contract.test.ts`.
  - Failures: schema validation gaps — `User` missing required `name/email/fitnessGoal`; `Team` missing required `name/mascot` (and contract expects `members` array/default handling); `Activity` missing required `type/user/team/minutes/points/occurredAt`; `Workout` missing required `focus/minutes/difficulty`.
  - Pass: `seeds representative data for all four capabilities idempotently` (seed upserts representative fixtures, preserves unrelated data, reconciles moved demo user membership).
- API command: `npm run test:api --prefix octofit-tracker/backend` (run 2026-11-24) — **4 failed / 0 passed** in `tests/api.contract.test.ts`.
  - Failures: `createActivity`/`createTeam` are unimplemented stubs returning 501 so invalid input is not rejected with 4xx and valid create/list contracts are unmet; malformed/missing activity refs are not handled as 4xx; `GET /api/leaderboard` returns `[]` instead of aggregated/sorted/ranked totals; `GET /api/workouts/suggestions/:userEmail` returns a non-user-specific workout and does not 4xx for unknown users (first suggestion does not match user focus/reason contract).
- Frontend command: `npm test --prefix octofit-tracker/frontend` — **not run yet** in this workspace (frontend `node_modules`/dependencies not installed locally). Per `tests/app.contract.test.tsx`, current static `CapabilityCard` views (`Implementation pending`) are expected to fail: missing fetch/rendered data, loading (`role="status"`), empty states, error alerts (`role="alert"`), and the workouts request to `/api/workouts/suggestions/mona@example.com`.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — **not run yet** (to be run after backend contract fixes to confirm TypeScript/build integrity).
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — **not run yet** (to be run after frontend contract fixes; requires dependencies/build environment).
