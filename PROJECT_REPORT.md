# MedAssist AI — Software Project Report

**Document type:** Technical Software Project Report
**Repository root:** `medassist-ai/`
**Verification basis:** Every statement in this report is derived directly from source code, configuration files, or schema files present in the repository at the time of writing. Where the repository's own documentation (`README.md`, code comments) contradicts the actual running code, both are stated explicitly and the discrepancy is called out — this report does not silently resolve such conflicts in either direction. Where information could not be verified (e.g., "why" a historical decision was made, absent a commit trail), this is stated rather than inferred. The repository contains a single Git commit (`e576b8a — "Initial commit - MedAssist AI v3.0"`), so no development history could be mined from commit logs; the "Challenges Solved" section instead draws on in-source documentation (code comments that explicitly record a prior failure mode and its fix) and on a substantial prior engineering engagement on this codebase whose work products (code, comments, and test results) are present in the repository.

---

## Table of Contents

1. Project Overview
2. Complete Technology Stack
3. Project Architecture
4. Folder Structure
5. Frontend Implementation
6. Backend Implementation
7. AI/ML Implementation
8. Database Design
9. Authentication System
10. API Documentation
11. Complete Project Workflow
12. Design Decisions
13. Challenges Solved
14. Security Features
15. Performance Optimizations
16. Deployment
17. Limitations
18. Future Improvements
19. Conclusion

---

## 1. Project Overview

### 1.1 Project Name
**MedAssist AI** (`package.json` → `"name": "medassist-ai"`, version `1.0.0`).

### 1.2 Purpose
Per the project's own `README.md`: *"Full-stack intelligent medical assistant application."* Concretely, and as verified against the actual code path (`packages/frontend/src/pages/patient/SymptomChecker.tsx` → `packages/backend/src/controllers/ai.controller.ts` → `packages/backend/ml/predict.py`), the system lets a user (patient or unauthenticated guest) describe symptoms in free text, receives a predicted disease, a severity level, an emergency flag, a differential-diagnosis list, and a recommended medical specialist, and — for authenticated patients — can book an appointment with a real (seeded) doctor and have a doctor review the AI-generated report.

### 1.3 Problem Statement
The system addresses the problem of a patient not knowing which type of medical specialist to consult, or how urgently, based on a free-text description of their symptoms. It combines a statistical disease classifier with a separate, rule-based emergency/severity layer so that a single wrong classifier guess cannot silently mask a genuine red-flag presentation (verified in `packages/backend/ml/predict.py`: the `emergency` flag is computed independently of the disease classifier and, when true, overrides the displayed diagnosis entirely).

### 1.4 Objectives (as evidenced by the implemented feature set)
- Provide free-text AI symptom analysis with a disease prediction, confidence score, and severity classification.
- Detect medical emergencies via rule-based pattern matching, independent of the statistical classifier, and surface this as a hard override.
- Recommend a relevant medical specialist and connect the user to a real, bookable doctor record.
- Support two user roles (`patient`, `doctor`) plus a stateless `guest` mode for symptom checking without registration.
- Allow doctors to review AI-generated reports, add their own diagnosis/notes/prescription, and manage appointments.
- Persist a patient's medical history (reports, appointments, notifications) for later reference.
- Provide static health-education content and a feedback mechanism.

### 1.5 Target Users
Two authenticated roles plus one unauthenticated mode, all verified from `packages/backend/src/middleware/auth.middleware.ts`'s `authorize()` calls and `packages/backend/sql/schema.sql`'s `Doctor`/`Patient` tables:
- **Patient** — the primary end user; registers, checks symptoms, books appointments, views history.
- **Doctor** — reviews AI-generated reports, manages their own appointments/availability/profile, adds notes for patients they have an existing treatment relationship with.
- **Guest** — can use the symptom checker (`/symptom-checker` route allows `['patient','guest']`) without registering, but nothing is persisted to their name (`ai.controller.ts`: `patientId` is `null` for guests, so no `Report`/`MedicalHistory`/`EmergencyAlert` row is written, though a `SymptomAnalysisLog` row is still written with `patientID = null`).

### 1.6 Key Features (verified against actual route/controller/page implementations)
1. Free-text AI symptom analysis (`POST /api/v1/ai/analyze`).
2. Rule-based emergency detection, independent of the ML classifier (`packages/backend/ml/emergency.py`).
3. Severity scoring on a MILD/MODERATE/SEVERE/CRITICAL scale (`determine_severity()` in `predict.py`).
4. Top-3 differential diagnosis list with per-term explanation of why each disease was or wasn't selected (`explain_prediction()` in `predict.py`), plus a checkmark-style "matched symptoms" list (`symptomsDetected`, from `determine_severity()`'s symptom-extraction layer — see §7.12) shown alongside confidence and the emergency banner in `SymptomChecker.tsx`.
5. Automatic specialist recommendation with a real, bookable doctor record (`resolve_doctor()` in `predict.py`; `GET /api/v1/doctors`).
6. Patient registration/login, doctor login, and guest login (`auth.routes.ts`).
7. Appointment booking with slot-conflict checking (`appointment.controller.ts`).
8. Doctor report review workflow (`doctor.controller.ts`'s `reviewReport`).
9. Patient medical history aggregation (`patient.controller.ts`'s `getHistory`).
10. Real-time notifications via Socket.IO (`sockets/notification.socket.ts`).
11. Static health-education articles (`education.service.ts`).
12. Patient feedback/rating submission (`feedback.controller.ts`).
13. Dark/light theme with pre-hydration flash prevention (`index.html`'s inline script + `store/theme.store.ts`).

---

## 2. Complete Technology Stack

All version numbers below are copied verbatim from the respective `package.json` files, not approximated.

### 2.1 Frontend (`packages/frontend/package.json`)

| Technology | Version | Where used | Why chosen (evidence-based) | Advantage in this project |
|---|---|---|---|---|
| React | `^18.3.1` | Entire UI (`src/`) | Industry-standard component model; enables the code-splitting pattern used throughout `App.tsx` | Large ecosystem, mature tooling, concurrent rendering features (not specifically exercised here, but available) |
| TypeScript | `^5.7.2` | All `.ts`/`.tsx` source | Static typing across a full-stack monorepo that shares conventions between packages | Catches type errors (e.g. mismatched API response shapes) at compile time |
| Vite | `^6.0.6` | Build tool (`vite.config.ts`), dev server on port 5173 | Confirmed as the actual build tool (not CRA) — `vite.config.ts` present, `@vitejs/plugin-react` in devDependencies | Fast HMR dev server; native ESM |
| Tailwind CSS | `^3.4.17` | All styling (`tailwind.config.js`, `src/index.css`) | Utility-first CSS with a custom `primary` color scale and dark-mode support (`darkMode:'class'`) | Rapid UI development, consistent design tokens, small production CSS via purge |
| React Router DOM | `^6.28.1` | `src/App.tsx`, `src/main.tsx` (`BrowserRouter`) | Client-side routing across ~25 distinct routes (see §5.4) | Declarative route/guard composition, lazy route-level code splitting |
| Axios | `^1.7.9` | `src/lib/api.ts` | Single HTTP client instance with request/response interceptors for auth-token attachment and refresh | Interceptor support makes the silent-refresh flow (see §9) straightforward |
| React Hook Form | `^7.54.2` | Auth pages, `DoctorProfile.tsx` | Paired with Zod via `@hookform/resolvers` (`^3.9.1`) for schema-driven forms | Uncontrolled-input performance, built-in validation-state management |
| Zod | `^3.24.1` | `src/pages/auth/authSchemas.ts`, inline in `DoctorProfile.tsx` | Same validation library used on the backend (`zod` also in backend's `package.json`) — a shared mental model across the stack, though schemas themselves are not shared as code | Type-safe schema validation, TypeScript type inference from schemas |
| Zustand | `^5.0.2` | `src/store/theme.store.ts` (the only Zustand store in the app) | Explicitly chosen over React Context for theme state because it must be readable synchronously before React mounts (per the file's own comment) | Minimal boilerplate, works outside the React render tree |
| socket.io-client | `^4.8.1` | `src/services/socket.service.ts` | Matches the backend's `socket.io` (`^4.7.5`) for real-time notifications | Automatic reconnection, room-based targeting |
| clsx` + `tailwind-merge` | `^2.1.1` / `^2.6.0` | `src/lib/cn.ts` | Conditional class-name composition without Tailwind class conflicts | Cleaner conditional styling logic in components |

**Dev/test tooling**: Vitest `^4.1.10` (not Jest — see §5.8 for the explicit reason recorded in the codebase), `@testing-library/react` `^16.1.0`, `jsdom` `^25.0.1`, ESLint `^8.57.1`, `autoprefixer`/`postcss` for the Tailwind build pipeline. `playwright` `^1.61.1` is present in `devDependencies` but **no Playwright test files or config exist anywhere in the frontend package** — it is an unused dependency, not a verified part of the test strategy.

### 2.2 Backend (`packages/backend/package.json`)

| Technology | Version | Where used | Why chosen (evidence-based) | Advantage in this project |
|---|---|---|---|---|
| Node.js | `>=18.0.0` (`engines`) | Runtime | — | LTS baseline |
| Express | `^4.18.2` | `src/app.ts` | The HTTP framework for the entire REST API | Minimal, middleware-centric, well understood |
| TypeScript | `^5.3.3` | All backend source | Same rationale as frontend | Compile-time safety for controller/service contracts |
| jsonwebtoken | `^9.0.2` | `src/middleware/auth.middleware.ts`, `src/utils/token.util.ts` | Access/refresh token signing and verification | Stateless auth, no server-side session store required for the access token itself |
| bcrypt | `^6.0.0` | `src/services/auth.service.ts`, `src/models/Patient.model.ts` | Password hashing | Industry-standard adaptive hashing, resistant to brute force via configurable cost factor |
| pg | `^8.11.3` | `src/config/db.ts` | Raw PostgreSQL client — **the database driver every controller actually queries through** (verified: every controller file imports `query` from `../config/db`) | Direct SQL control, no ORM abstraction overhead |
| mongoose | `^8.3.2` | `src/config/database.ts`, `src/models/Patient.model.ts` | MongoDB ODM — connected and required at boot, but **only one model exists and it is not used by any controller** (see §6.7 and §17) | Schema validation, hooks (used for password hashing in the one model that exists) |
| zod | `^3.22.4` | `src/validators/*.validator.ts` | Request-body/query/param validation schemas | Shared validation idiom with the frontend |
| multer | `^1.4.5-lts.1` | `src/middleware/upload.middleware.ts` | File upload handling — **built but not mounted on any route** (verified: no route file imports `uploadSingle`/`uploadMultiple`) | N/A in current usage — dead code, documented as such in §17 |
| helmet | `^7.1.0` | `src/app.ts` | Sets security-related HTTP headers | Baseline hardening against common header-based attacks |
| cors | `^2.8.5` | `src/app.ts` | Cross-origin request control, origin list from `CORS_ORIGIN` env var | Restricts which frontends may call the API |
| compression | `^1.7.4` | `src/app.ts` | Gzip response compression | Reduces payload size |
| express-rate-limit | `^7.1.5` | `src/middleware/rateLimiter.middleware.ts` | Four distinct limiters (general/auth/analysis/write — see §14) | Basic abuse/DoS mitigation |
| ioredis | `^5.4.1` | `src/config/redis.ts`, `src/utils/redisClient.ts` | Redis client, used in a best-effort (never-throws) caching wrapper | Optional performance layer that degrades gracefully if Redis is unavailable |
| winston` + `winston-daily-rotate-file` | `^3.13.0` / `^5.0.0` | `src/utils/logger.ts` | Structured logging, daily-rotated files in production | Operational visibility |
| socket.io | `^4.7.5` | `src/sockets/notification.socket.ts` | Real-time, JWT-authenticated, per-user-room notifications | Matches frontend's socket.io-client version |

**Dev/test tooling**: **Jest** `^29.7.0` with `ts-jest` is the actual test runner (`jest.config.js`) — although `vitest`/`@vitest/coverage-v8` (`4.1.10`) are listed in `dependencies` (not `devDependencies`), they are not the configured runner and appear unused in this package. `mongodb-memory-server` `^10.1.2` is used specifically for the one Mongoose model's test suite (spins up a real in-memory MongoDB instance rather than mocking Mongoose). `supertest` `^7.0.0` for HTTP-level controller tests.

### 2.3 Machine Learning (`packages/backend/ml/`, Python)

No `requirements.txt` or version-pinned dependency file exists inside `packages/backend/ml/` itself (verified: `find` for `*.txt`/`*.cfg`/`pyproject.toml` under that directory returns nothing) — the ML environment's exact library versions are not pinned in-repo for this package (contrast with `packages/rag-service/requirements.txt`, which does pin versions for the separate RAG prototype). The following are used, per direct import statements in the `.py` source files:

| Technology | Where used | Why chosen (evidence from code comments) | Advantage in this project |
|---|---|---|---|
| Python 3 | All of `ml/` | — | — |
| pandas | `train_model.py`, `predict.py` | CSV loading and manipulation for all six data files | Convenient tabular data handling for merging three heterogeneous training sources |
| NumPy | `train_model.py`, `predict.py` | Numeric array operations (coefficient averaging, calibration-fold aggregation) | Required by scikit-learn; used directly for `np.mean()` over per-fold coefficients in `_average_coefficients()` |
| scikit-learn | `train_model.py`, `predict.py` | `TfidfVectorizer`, `LogisticRegression`, `CalibratedClassifierCV`, `StratifiedKFold`, metrics (`accuracy_score`, `classification_report`, `f1_score`, `log_loss`, `confusion_matrix`) | Mature, well-understood classical ML stack; the module docstring in `train_model.py` explicitly documents *why* this was kept classical rather than moved to embeddings (see §12) |
| joblib | `train_model.py`, `predict.py` | Serializing/deserializing `disease_model.pkl` and `vectorizer.pkl` | Standard scikit-learn model persistence mechanism |
| re (regex) | `predict.py`, `emergency.py`, `text_normalize.py`, `phrase_matching.py` | Whole-word/whole-phrase pattern matching for severity, emergency, and synonym detection | Lightweight, no additional NLP dependency needed for phrase-level matching |

**TF-IDF configuration** (`train_model.py`, `build_vectorizer()`): `ngram_range=(1,2)` (unigrams + bigrams), `max_features=5000`, `sublinear_tf=True`, and a custom stop-word list — sklearn's built-in `"english"` list plus four additional words (`feel`, `feeling`, `feels`, `felt`) added after direct evidence that `feel` carried a disproportionate, non-diagnostic coefficient (documented in the `EXTRA_STOP_WORDS` comment in `train_model.py` and in this engagement's own investigation — see §13).

**Model**: `LogisticRegression(class_weight="balanced", C=500)` wrapped in `CalibratedClassifierCV(cv=3, method="sigmoid")`. The exact value `C=500` and `cv=3` (reduced from an original `cv=5`) are both the result of a documented, evidence-based tuning process recorded in the `LOGREG_C` comment block in `train_model.py` and reconstructed in full in §7 and §13 of this report.

**No NLP libraries beyond regex** (no spaCy, no NLTK, no transformer models) are used anywhere in `packages/backend/ml/`. All synonym handling and phrase normalization is implemented as hand-curated dictionaries matched via `re`.

### 2.4 Separate/Adjacent Python Service — `packages/rag-service/`
A structurally separate prototype exists (`packages/rag-service/`), implementing "Phase 1 (retrieval-only, no LLM)" of a Retrieval-Augmented-Generation redesign described in `docs/RAG_ARCHITECTURE.md`. Its `requirements.txt` specifies FastAPI, ChromaDB, and sentence-transformers (embedding-based retrieval), and it maintains its own local vector store (`packages/rag-service/chroma_db/`). **Verified: no file under `packages/backend/src/` references this service** (`grep` for `rag-service`, `rag_service`, or the service's default port `8000` across `packages/backend/src/` returns zero matches) — it is not called by, or wired into, the live application. It is documented here for completeness of "explore the entire project," not because it is part of the request path described in §11.

### 2.5 Database Engines
Two database engines are actually configured and connected, per direct code verification (not assumption):

| Engine | Client library | Connection file | Status |
|---|---|---|---|
| PostgreSQL | `pg` `^8.11.3` | `packages/backend/src/config/db.ts` | **Live** — every controller (`auth`, `ai`, `appointment`, `doctor`, `feedback`, `patient`) queries this database directly via a shared `query()` helper. |
| MongoDB | `mongoose` `^8.3.2` | `packages/backend/src/config/database.ts` | **Connected but functionally idle** — required at server boot (`server.ts` exits the process if this connection fails), but only one Mongoose model exists (`Patient.model.ts`) and it is imported by nothing outside its own test file. |
| Redis | `ioredis` `^5.4.1` | `packages/backend/src/config/redis.ts` | **Optional/best-effort** — wrapped so that cache operations never throw if Redis is down; `REDIS_ENABLED` env flag can disable it entirely. |

This dual-database state is a genuine, verifiable architectural fact about the current codebase, not a design recommendation of this report — it is documented in full in §6.7, §8, and §17.

---

## 3. Project Architecture

### 3.1 High-Level Component Diagram

```
┌──────────────────────┐
│   Frontend (React)   │   packages/frontend/src
│  Vite dev :5173       │
└───────────┬───────────┘
            │ HTTPS/JSON  (axios, baseURL = VITE_API_BASE_URL)
            │ WebSocket   (socket.io-client, auth: {token})
            ▼
┌──────────────────────────────────────────────┐
│         Backend API (Express)                │  packages/backend/src
│         :3000  /api/v1/*                      │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ Middleware  │→│ Controllers │→│ Services  │ │
│  │ (auth, rate │  │ (thin HTTP  │  │ (business │ │
│  │  limit,     │  │  handlers)  │  │  logic)   │ │
│  │  validate)  │  └────────────┘  └──────────┘ │
│  └────────────┘                                │
└───────┬───────────────┬───────────────┬────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐
│ PostgreSQL    │ │ MongoDB       │ │ Python ML Engine     │
│ (pg.Pool)     │ │ (Mongoose)    │ │ predict.py           │
│ — LIVE data   │ │ — connected,  │ │ (spawned as a child  │
│   layer for   │ │   idle;       │ │  process per request)│
│   every       │ │   1 unused    │ │                       │
│   controller  │ │   model       │ │  ┌─────────────────┐  │
└──────────────┘ └──────────────┘ │  │ emergency.py     │  │
        ▲                          │  │ text_normalize.py │  │
        │                          │  │ phrase_matching.py│  │
        │                          │  └─────────────────┘  │
        │                          └──────────┬────────────┘
        │                                     │ stdout JSON
        │                                     ▼
        │                          ┌─────────────────────┐
        └──────────────────────────│  ai.controller.ts    │
                                   │  persists Report,     │
                                   │  MedicalHistory,       │
                                   │  EmergencyAlert (PG)   │
                                   └─────────────────────┘

Redis (ioredis) — best-effort cache/session layer, referenced by
config but with no confirmed active cache-hit code path in ai.controller.ts.
```

### 3.2 Request Flow: Frontend → Backend → Auth → Database → Python ML Engine → Prediction → Doctor Recommendation → Response

This is traced exactly, file-by-file, for the symptom-analysis flow (the system's core feature):

1. **Frontend**: `SymptomChecker.tsx` collects free text (or voice-to-text via the Web Speech API) in a controlled `<textarea>`, and on submit calls `analyzeSymptoms(symptoms, inputType)` (`src/lib/endpoints/ai.ts`), which POSTs to `/ai/analyze` through the shared axios instance (`src/lib/api.ts`), whose request interceptor attaches `Authorization: Bearer <accessToken>` if a session exists (guests have no token — the endpoint tolerates this, see next step).

2. **Backend routing**: `POST /api/v1/ai/analyze` (mounted via `routes/index.ts` → `ai.routes.ts`) passes through, in order: `aiAnalysisLimiter` (10 requests/60s, IP-based) → `optionalAuthenticate` (decodes a JWT if present but never rejects the request if absent or invalid — this is what allows guest access) → `validate(analyzeSymptomsSchema)` (Zod: `symptoms` 3–2000 chars, `inputType` enum) → `aiController.analyzeSymptoms`.

3. **Authentication check**: inside the controller, `req.user?.role === 'patient'` determines whether this is an authenticated patient (whose result will be persisted) or a guest (whose result will not be persisted to a patient record, though it is still logged anonymously).

4. **Python ML Engine invocation**: `callPythonModel(symptoms)` (`services/python.service.ts`) spawns `PYTHON_EXECUTABLE` (default `python`) with `PREDICT_SCRIPT_PATH` (default `./ml/predict.py`) and the raw symptom string as `argv[1]`, capturing stdout/stderr, and rejecting with a structured `ApiError` on non-zero exit or malformed JSON output.

5. **Inside `predict.py`** (see §7 for full detail): the raw text is lowercased and whitespace-collapsed; three **independent** matching systems run against it — TF-IDF classification (via `text_normalize.py`-normalized text), rule-based severity scoring (via `Symptom-severity.csv`-derived phrases), and rule-based emergency detection (via `emergency.py`'s own concept-phrase dictionary, entirely separate from the severity vocabulary). The classifier's calibrated confidence is thresholded at 25% for abstention (`CONFIDENCE_ABSTAIN_THRESHOLD`); if `check_emergency()` returns true, the disease/doctor output is overridden to a fixed `"Emergency — seek immediate medical attention"` regardless of what the classifier predicted.

6. **Doctor recommendation**: `resolve_doctor()` looks up the predicted (or emergency-overridden) condition in `doctor_map.json` (a disease-name-keyed static file, verified to have zero missing/dead entries against the model's actual 42 trained classes); if no mapping exists (only relevant for the `Uncertain`/`Emergency` labels, which are not real disease classes), it falls back to a hardcoded `KEYWORD_DOCTOR_MAP` matched against the raw symptom text.

7. **Back in Node**: `ai.controller.ts` receives the parsed JSON prediction, then calls `resolveDoctorId(prediction.doctor)` (`python.service.ts`) — a **separate, database-backed** lookup that queries the live `Doctor` Postgres table for a real, available doctor with that specialization (falling back to any available `General Physician` if none match), returning an actual `doctorID` the frontend can use to book an appointment.

8. **Persistence** (Postgres, only if `patientId` is non-null): an `INSERT INTO Report` (symptoms, ai_diagnosis, ai_confidence, status `PENDING`), an `INSERT INTO MedicalHistory` (a human-readable summary line), and — only if `prediction.emergency` is true — an `INSERT INTO EmergencyAlert`. Regardless of authentication state, an `INSERT INTO SymptomAnalysisLog` is always written (with `patientID = null` for guests).

9. **Response**: `sendSuccess()` returns a flat JSON object (diagnosis, confidence, emergencyDetected, severity, description, recommendations, differentials, assignedDoctor, doctorReason, assignedDoctorId, reportId, responseTime) with a top-level message that is literally `'🚨 CRITICAL: Seek immediate medical attention!'` when `prediction.emergency` is true, or `'Analysis complete.'` otherwise.

10. **Frontend rendering**: `SymptomChecker.tsx` renders the result, color-coding severity and prominently surfacing the emergency banner if present.

### 3.3 Component Communication Summary

| From | To | Mechanism | Evidence |
|---|---|---|---|
| Frontend | Backend | HTTPS/JSON via Axios | `src/lib/api.ts` |
| Frontend | Backend | WebSocket (Socket.IO) | `src/services/socket.service.ts` ↔ `src/sockets/notification.socket.ts` |
| Backend | Python ML | Child process, stdin/argv → stdout JSON | `src/services/python.service.ts` (`spawn()`) |
| Backend | PostgreSQL | TCP, `pg.Pool` | `src/config/db.ts` |
| Backend | MongoDB | TCP, Mongoose driver | `src/config/database.ts` (connected but idle — see §17) |
| Backend | Redis | TCP, `ioredis` | `src/config/redis.ts` |
| Backend controllers | Backend services | Direct function calls (no network hop) | e.g. `ai.controller.ts` calling `python.service.ts`'s exported functions |

---

## 4. Folder Structure

### 4.1 Repository Root

```
medassist-ai/
├── .github/workflows/deploy.yml   — CI/CD pipeline (lint → test → build → deploy)
├── .husky/                        — Git hooks (lint-staged on commit, per root package.json)
├── docker-compose.yml             — Dev-oriented compose file (Mongo + Redis + backend + frontend — no Postgres service, see §17)
├── docker-compose.prod.yml        — Production compose file (adds Postgres + mongo-init + nginx)
├── docs/RAG_ARCHITECTURE.md       — Design document for the separate, unwired RAG prototype
├── nginx/nginx.conf                — Reverse-proxy config referenced by docker-compose.prod.yml's nginx service
├── scripts/deploy.sh               — Shell script run by the CI/CD deploy job over SSH
├── scripts/migrate-data.js         — Data migration script (exists at root — its role relative to the Postgres→Mongo transition was not further traced in this report; see §17)
├── packages/
│   ├── backend/                   — Node/Express API + Python ML engine (two languages, one package folder)
│   ├── frontend/                  — React SPA
│   └── rag-service/                — Standalone, unwired RAG retrieval prototype (Python/FastAPI)
├── package.json                   — npm workspaces root (`"workspaces": ["packages/backend","packages/frontend"]` — rag-service is deliberately excluded from the npm workspace, consistent with it being a separate Python-only prototype)
└── README.md                       — Project documentation (contains some claims not matched by the current code — see §17)
```

**Why each exists**: this is an npm-workspaces monorepo (root `package.json`'s `workspaces` field) so that `npm run dev`/`build`/`test`/`lint` can orchestrate both the backend and frontend packages from one root command (`concurrently` is used for the parallel `dev` script) while each package retains its own independent `package.json`/`tsconfig.json`/dependency tree.

### 4.2 `packages/backend/src/`

Purpose of each subfolder, based on direct inspection of file contents (not filename inference):

| Folder | Purpose |
|---|---|
| `config/` | Environment loading (`env.ts`, Zod-validated) and the three external-service connections (`db.ts` Postgres, `database.ts` MongoDB, `redis.ts` Redis) |
| `controllers/` | Thin HTTP handlers — parse the request, delegate to a query or service, format the response. One file per resource (`auth`, `ai`, `appointment`, `doctor`, `feedback`, `patient`) |
| `routes/` | Express `Router` instances wiring middleware chains to controller functions; `index.ts` mounts every sub-router under the versioned API prefix |
| `services/` | Business logic decoupled from Express so it can be tested without an HTTP layer (`auth.service.ts`, `education.service.ts`, `python.service.ts`) |
| `middleware/` | Cross-cutting request-processing concerns: JWT auth (`auth.middleware.ts`), centralized error formatting (`errorHandler.middleware.ts`), rate limiting (`rateLimiter.middleware.ts`), file uploads (`upload.middleware.ts`, currently unused), Zod validation (`validate.middleware.ts`) |
| `validators/` | Zod schemas, one file per resource, imported by route files via the `validate()` middleware |
| `models/` | Mongoose schema definitions — contains exactly one model (`Patient.model.ts`), not used by any controller (see §17) |
| `sockets/` | Socket.IO server setup: JWT-authenticated handshake, per-user rooms, a small typed API (`notifyUser`, `emitToUser`, `broadcast`) |
| `utils/` | Shared helpers: two structurally-identical error classes (`ApiError.ts`, `AppError.ts` — see §13 for why both exist), the success-response envelope (`apiResponse.ts`), the `asyncHandler` wrapper, application-wide constants, the Winston logger, Redis cache-wrapper functions, JWT-signing helpers, and a set of hand-rolled validators that are defined but not called anywhere (see §17) |
| `types/` | Shared TypeScript ambient types (`Request.user` augmentation, role union type) |
| `__tests__/` | Jest test suite — three files, covering `auth.service`, `Patient.model`, and `patient.controller` only |

### 4.3 `packages/backend/ml/`

| File/Folder | Purpose |
|---|---|
| `train_model.py` | Trains the disease classifier from the three CSV sources; performs leakage-free cross-validation; saves `disease_model.pkl`/`vectorizer.pkl` |
| `predict.py` | The CLI entry point invoked per request by `python.service.ts`; runs the full prediction pipeline and prints one JSON object to stdout |
| `emergency.py` | Single source of truth for red-flag/emergency detection, shared conceptually by the classic pipeline and (per its own docstring) intended for the separate RAG pipeline as well |
| `text_normalize.py` | Synonym/morphology normalization applied identically at training and inference time, to the text that reaches the TF-IDF vectorizer only |
| `phrase_matching.py` | One shared helper (`compile_phrase_alternation`) used by `emergency.py`, `text_normalize.py`, and `predict.py`'s severity-phrase builder, eliminating what was previously duplicated regex-compilation logic in three places |
| `doctor_map.json` | Disease name → specialist title, one entry per trained class |
| `data/` | The six CSV data files (see §7.1) |
| `disease_model.pkl` / `vectorizer.pkl` | Serialized trained model artifacts, loaded fresh on every single prediction request (a deliberate, documented tradeoff — see §15) |
| `tests/cases.json` + `tests/run_cases.py` | A 28-case hand-written regression suite, run through `predict.py`'s real CLI interface, distinct from the CSV-based cross-validation |
| `sql/schema.sql` (backend, not ml) | The reverse-engineered Postgres schema (§8) |

### 4.4 `packages/frontend/src/`

| Folder | Purpose |
|---|---|
| `components/` | Shared UI: role-specific shells (`PatientAppShell.tsx`, `DoctorAppShell.tsx`), the route guard (`ProtectedRoute.tsx`), an error boundary, a reusable component library (`common/`), and page-chrome components (`layout/`) |
| `context/` | React Context providers for auth, patient data, doctor data, notifications, and theme |
| `hooks/` | Custom hooks: `useApi` (HTTP wrapper with retry), `useAuth` (auth state + route-guard hooks), `useLocalStorage`, `useToast`, `useWebSocket` |
| `lib/` | Core infrastructure: the Axios instance/interceptors, token storage, a class-name helper, report-export logic, and every typed API-call function, grouped by domain under `lib/endpoints/` |
| `pages/` | Route-level components, split into `auth/`, `patient/`, `doctor/`, plus top-level static pages |
| `services/` | `api.service.ts` (a deliberate re-export of `lib/api.ts` to avoid import-site churn, per its own comment) and `socket.service.ts` |
| `store/` | The single Zustand store (theme) |
| `types/` | Shared domain types for patient/doctor objects |
| `utils/` | Generic formatting/validation helpers, distinct from the Zod schemas |
| `__tests__/` | Vitest test suite — three spec files plus setup |
| `config/` | `env.ts`, the single place reading `import.meta.env` |

---

## 5. Frontend Implementation

### 5.1 Pages
Every route-level component, with its verified purpose (see §3 of the frontend audit this report is built from):

| Page | Route | Purpose |
|---|---|---|
| `Login.tsx` | `/login` | Role-selectable (patient/doctor) sign-in with React Hook Form + Zod |
| `Signup.tsx` | `/signup` | Patient registration |
| `ForgotPassword.tsx` | `/forgot-password` | Collects email; posts to a backend endpoint that **does not exist** (verified against `auth.routes.ts`'s six actual routes — no `/forgot-password`) |
| `ResetPassword.tsx` | `/reset-password` | Submits a new password against a token; same backend gap as above |
| `GuestLogin.tsx` | `/guest` | One-click guest session, redirects to `/symptom-checker` |
| `AuthCallback.tsx` | `/auth/callback` | OAuth redirect handler; built against a backend OAuth flow that **does not exist** (no `/auth/google` or passport strategy anywhere in `auth.routes.ts`) |
| `Dashboard.tsx` | `/` | Patient home: stats, notifications, upcoming appointments, recent reports |
| `SymptomChecker.tsx` | `/symptom-checker` | The AI symptom-analysis UI (text or voice input) |
| `MedicalHistory.tsx` | `/history` | Full patient history (reports + appointments), exportable to text |
| `AppointmentBooking.tsx` | `/appointments/book` | Multi-step doctor→date/time→confirm booking wizard |
| `AppointmentList.tsx` | `/appointments` | Lists/cancels the patient's own appointments |
| `ReportView.tsx` | `/reports/:id` | Single-report detail (client-side filtered from the full report list — no single-report GET endpoint exists on the backend) |
| `Education.tsx` | `/education` | Static health-education article browser |
| `Feedback.tsx` | `/feedback` | Star-rating + comments form |
| `DoctorDashboard.tsx` | `/doctor` | Doctor home: stats, availability toggle, report counts |
| `ReportReview.tsx` | `/doctor/reports` | Pending/reviewed AI report list with a diagnosis/notes/prescription review form |
| `AppointmentManager.tsx` | `/doctor/appointments` | Doctor's appointment list with status updates |
| `PatientHistory.tsx` | `/doctor/patients` | Searchable roster of the doctor's own patients (client-derived from reports+appointments), with per-patient detail/notes |
| `DoctorProfile.tsx` | `/doctor/profile` | Doctor profile edit form + availability settings |
| `NotFoundPage.tsx` | `*` | Generic 404 |
| `StaticPage.tsx` | `/about`, `/privacy`, `/terms` | Generic static-content wrapper |
| `ComponentsShowcasePage.tsx` | `/components` | Internal demo page for the shared component library |

### 5.2 Components
The shared component library lives in `src/components/common/` (Button, Input, Modal, Table, Toast, Alert, Badge, Card, DatePicker, Dropdown, Form, Loader, Pagination, Select, Skeleton, Tabs, plus an `icons.tsx` module), barrel-exported via `common/index.ts`. Layout chrome (`Header`, `Sidebar`, `Footer`, `Layout`, `AuthLayout`, `DashboardLayout`) lives separately in `src/components/layout/`. Two role-specific "app shell" components (`PatientAppShell.tsx`, `DoctorAppShell.tsx`) wrap their respective route trees in a shared `<Suspense>`/`<ErrorBoundary>` pair, since all patient/doctor pages are lazy-loaded.

### 5.3 Hooks
- `useApi.ts` — a generic HTTP-call wrapper with retry logic.
- `useAuth.ts` — re-exports the auth context plus two additional guard hooks, `useRequireAuth()` and `useRequireRole(role)`, for use inside component bodies rather than as route wrappers.
- `useLocalStorage.ts` — generic localStorage-backed state.
- `useToast.ts` — re-export of the toast system.
- `useWebSocket.ts` — WebSocket connection lifecycle hook.

### 5.4 State Management
No Redux is used. State is managed via two mechanisms, confirmed by direct inspection:
1. **React Context** for domain data — `AuthContext.tsx`, `PatientContext.tsx`, `DoctorContext.tsx`, `NotificationContext.tsx`.
2. **Zustand** for exactly one piece of UI state — theme (`store/theme.store.ts`) — specifically because theme must be readable synchronously before React mounts (the `index.html` pre-hydration script reads the same `localStorage` key to prevent a flash of the wrong theme). `ThemeContext.tsx` wraps this store in a Context-shaped API purely for consistency with the other providers.

No React Query, SWR, or Recoil is present.

### 5.5 API Integration
A single Axios instance (`src/lib/api.ts`) with:
- A **request interceptor** that attaches `Authorization: Bearer <token>` from whichever storage (`localStorage` or `sessionStorage`, per the "remember me" choice at login) currently holds a session.
- A **response interceptor** that, on a `401` (excluding the login/signup endpoints themselves), deduplicates concurrent refresh attempts into a single in-flight `POST /auth/refresh` call (issued via a bare `axios.post`, not the intercepted `api` instance, to avoid interceptor recursion), updates the stored access token, and retries the original request exactly once before giving up and clearing the session.

Every backend call is a typed function in `src/lib/endpoints/*.ts`, grouped by resource (`ai.ts`, `appointments.ts`, `doctor.ts`, `doctorPatients.ts`, `doctors.ts`, `feedback.ts`, `patient.ts`) — full endpoint-to-function mapping is given in §10.

### 5.6 Routing
`react-router-dom` v6, `BrowserRouter` mounted in `main.tsx`. Route protection is implemented by `ProtectedRoute.tsx`, which reads `isAuthenticated`/`isLoading`/`user.role` from `useAuth()` and either shows a loader, redirects unauthenticated users to `/login` (preserving the attempted path in navigation state), or redirects wrong-role users to their own role's home page (`ROLE_HOME` map in `AuthContext.tsx`: `patient→'/'`, `doctor→'/doctor'`, `guest→'/guest'` — specifically structured so a wrong-role redirect can never loop). Every patient/doctor page is loaded via `React.lazy()` for code-splitting.

### 5.7 Validation & Forms
Zod schemas (`src/pages/auth/authSchemas.ts` plus one inline schema in `DoctorProfile.tsx`) paired with React Hook Form via `@hookform/resolvers`'s `zodResolver`. Field-level errors are rendered inline by the shared `Input` component; top-level submission failures use the shared `Alert` component plus a toast. Not every form uses this stack — `Feedback.tsx`, `AppointmentBooking.tsx`, and several doctor-page inline modals use plain `useState` with manual HTML validation attributes instead of React Hook Form.

### 5.8 UI Design
Tailwind CSS with a custom `primary` color scale and custom animation keyframes (`fade-in`, `slide-up`, `slide-in-right`, `slide-in-left`, `loading-bar`), dark-mode via a `class`-based strategy toggled by the Zustand theme store.

### 5.9 Testing
**Vitest**, not Jest — and the codebase itself documents why: `vitest.config.ts`'s own header comment states the project was originally asked for a Jest config, but Vitest was substituted because Jest cannot natively parse `import.meta.env` (used throughout `src/config/env.ts`) without extra shims, and Vitest is "a near-drop-in Jest-API replacement." Three spec files exist (`Button.test.tsx`, `useAuth.test.tsx`, `Login.test.tsx`), covering only the shared `Button` component, the auth context/hook, and the `Login` page end-to-end with a mocked API layer. The coverage configuration sets an 80% threshold across statements/branches/functions/lines, explicitly documented in a comment as an aspirational target rather than a currently-met bar.

---

## 6. Backend Implementation

### 6.1 Routes
Full endpoint tables are given in §10 (API Documentation) to avoid duplication. Summary: seven resource routers (`auth`, `patient`, `doctor`, `doctors`, `appointments`, `ai`, `feedback`) mounted under `/api/v1` in `routes/index.ts`, plus a `/health` liveness endpoint registered directly in `app.ts` (separate from `/api/v1/health`).

### 6.2 Controllers
Six controller files, each exporting `asyncHandler`-wrapped functions (every single controller function in the codebase is wrapped this way, so thrown/rejected errors always reach the centralized error handler):
- **`auth.controller.ts`**: `signup`, `login`, `guestLogin`, `logout`, `refreshToken`, `getCurrentUser`.
- **`ai.controller.ts`**: `analyzeSymptoms`, `getEducation`, `getDoctorRecommendation`, `getPredictionHistory`.
- **`appointment.controller.ts`**: `getAvailableSlots`, `bookAppointment`, `cancelAppointment`, `getPatientAppointments`, `getDoctorAppointments`, `updateStatus`.
- **`doctor.controller.ts`**: `listDoctors`, `getProfile`, `updateProfile`, `getPendingReports`, `getReviewedReports`, `reviewReport`, `getAppointments`, `updateAvailability`, `getStats`, `getPatientDetail`, `addPatientNote`.
- **`feedback.controller.ts`**: `submitFeedback`, `getFeedback`, `getStats`.
- **`patient.controller.ts`**: `getProfile`, `updateProfile`, `getHistory`, `getReports`, `getStats`, `getNotifications`, `markNotificationRead`.

### 6.3 Services
Business logic kept separate from Express so it is unit-testable without an HTTP layer:
- **`auth.service.ts`**: `registerPatient` (bcrypt-hashes with a hardcoded `SALT_ROUNDS = 10`, checks for duplicate email → 409), `loginUser` (verifies against the correct table for the requested role, rejects deactivated accounts *before* calling `bcrypt.compare` at all — verified via its own test asserting `bcrypt.compare` is never invoked in that branch), `guestLogin` (issues tokens with no database access at all), and `generateTokensFor`.
- **`education.service.ts`**: static, in-memory lookup of health-education article content by topic.
- **`python.service.ts`**: `callPythonModel()` (spawns `predict.py`, parses its JSON stdout) and `resolveDoctorId()` (maps a specialist title to a real, available `Doctor` row via a direct Postgres query, with a `General Physician` fallback).

### 6.4 Middlewares
- **`auth.middleware.ts`**: `authenticate` (hard 401 if the bearer token is missing/invalid), `optionalAuthenticate` (never rejects — used by `/ai/analyze` to permit guests), `authorize(...roles)` (403 if the authenticated user's role isn't in the allowed set). JWT verification uses `jsonwebtoken`'s default algorithm (HS256, since `JWT_SECRET` is a plain string with no explicit algorithm parameter passed to `sign`/`verify`); only the `role` claim is inspected for authorization decisions beyond whatever `jwt.verify` itself validates (expiry, signature). Two additional guard-composition helpers (`requireAuth`, `requirePatient`, `requireDoctor`, `requireGuest`, `ensureSelfOrDoctor`) are defined in this file but are **not referenced by any route file** — every route instead calls `authenticate`/`authorize` inline.
- **`errorHandler.middleware.ts`**: the actual centralized error handler (see §6.6), registered last in `app.ts`.
- **`error.middleware.ts`** / **`validation.middleware.ts`**: thin re-export shims over `errorHandler.middleware.ts`/`validate.middleware.ts` respectively — both files' own comments state they exist to satisfy a naming convention, with no independent logic (see §13).
- **`rateLimiter.middleware.ts`**: four `express-rate-limit` instances — see §14.
- **`upload.middleware.ts`**: a fully-configured Multer setup (disk storage, MIME allow-list, 5MB/5-files limits) that is **not mounted on any current route**.
- **`validate.middleware.ts`**: `validate(schema, target='body')` — parses `req[target]` through a Zod schema, replacing it with the coerced value, or throwing a structured 400 with per-field `{path,message}` details on failure.

### 6.5 Authentication & Authorization
Covered in full in §9.

### 6.6 Error Handling
Two structurally identical error classes coexist: `utils/ApiError.ts` (used by controllers, services, and the Postgres-facing code) and `utils/AppError.ts` (used by middleware). Both expose the same static factory methods (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `tooManyRequests`, `internal`; `AppError` additionally has `unprocessable`). They are unified for handling purposes by `AppError.ts`'s exported `isHttpError()` — a structural (duck-typed) type guard on `statusCode`+`message`, so the single global handler can treat either class the same way without importing both.

The global handler (`errorHandler.middleware.ts`) normalizes, in order: known `AppError`/`ApiError`-shaped errors (use their own status/message/details) → Mongoose `ValidationError` (400, per-field details) → Mongoose `CastError` (400) → MongoDB duplicate-key error code `11000` (409) → `MulterError` (400) → `TokenExpiredError`/`JsonWebTokenError` (401) → anything else (500, with the real message hidden behind a generic "Internal server error" string in production). The response shape is always `{ success: false, error: string, details?: unknown }`.

The success-response envelope (`utils/apiResponse.ts`) returns `{ success: true, message?, ...extra }` — extra fields are spread at the top level, **not** nested under a `data` key, which is a documented discrepancy against `README.md`'s description of the API response format (see §17).

### 6.7 Database Access
Detailed fully in §8. In summary: every controller queries PostgreSQL directly via a shared `query()` helper (`config/db.ts`); MongoDB is connected (and required at boot) via Mongoose but has exactly one model (`Patient.model.ts`), which is not imported by any controller or service — it is exercised only by its own dedicated test file.

### 6.8 File Structure
Given in full in §4.2.

---

## 7. AI/ML Implementation

This section documents the machine learning engine in `packages/backend/ml/` in full, reflecting its current, verified state after an extensive tuning and debugging engagement (see §13 for the specific problems solved).

### 7.1 Datasets
Six CSV files in `packages/backend/ml/data/`, three of which feed the classifier's training corpus and three of which serve other pipeline stages:

| File | Rows | Role |
|---|---|---|
| `Symptom2Disease.csv` | 1,232 (24 classes) | Primary free-text training source — real-sentence-style symptom descriptions, matching the app's actual textarea input shape |
| `correct_symptoms.csv` | 6 (1 class: Oral Ulcer (Canker Sore)) | Small supplementary free-text set for a condition otherwise entirely absent from the other two sources |
| `dataset.csv` | 4,920 rows → 4,920 total, but only **~303 unique symptom combinations** after exact-duplicate removal (verified directly) | Structured checkbox-style data (`Disease` + up to 17 `Symptom_n` columns), covering 41 diseases, 17 of which have **zero** free-text representation anywhere else (see §17) |
| `Symptom-severity.csv` | 131 symptoms (after cleanup — was 133) | Symptom → integer severity weight (1–7), used only by `predict.py`'s rule-based severity scorer, entirely separate from the classifier |
| `symptom_Description.csv` | 41 diseases | Disease → free-text description, keyed by disease name (no symptom-name field at all) |
| `symptom_precaution.csv` | 41 diseases | Disease → up to 4 precaution strings, keyed by disease name |

**Data-quality finding (verified, corrected during this engagement)**: `dataset.csv`'s raw 4,920 rows are not 4,920 independent examples — they are a small number of unique symptom combinations (as few as 4–10 per disease) each repeated 12–30 times to pad row count. This has two consequences documented in full in §13: it inflated reported cross-validation accuracy through train/validation leakage, and it caused certain duplicated combinations to act as an implicit, uneven sample weight in the classifier's loss function.

### 7.2 Preprocessing & Feature Extraction
Three data sources are merged into one `[label, text]` training frame by `train_model.py`'s `load_data()`:
1. `Symptom2Disease.csv` and `correct_symptoms.csv` are used as-is (already free text).
2. `dataset.csv`'s per-row checkbox columns are converted into pseudo-natural-language via `parse_dataset_symptoms()` (e.g. `"skin_rash"` → `"skin rash"`, joined into a comma-separated string).
3. Labels are normalized to `dataset.csv`'s own spelling via `canonical_label_map()` (a case-insensitive lookup with three hand-coded aliases for the handful of cases where the free-text sources spell a disease differently, e.g. `"gastroesophageal reflux disease"` → `"GERD"`).
4. Every row's text is passed through `normalize_symptom_text()` (`text_normalize.py`) — a synonym-canonicalization step (e.g. `burns`/`burnt`/`burned`→`burning`; `eating`/`after i eat`→`meals`) applied **identically** at training time and at inference time, specifically to let TF-IDF's exact-token matching bridge paraphrases it otherwise couldn't (e.g. "my chest burns after eating" vs. a training example phrased "burning chest pain after meals").
5. Exact-duplicate rows are removed, per-source, before any split or fit happens (`load_data()`'s final step) — the fix for the leakage issue described in §13.

**Feature extraction**: `TfidfVectorizer(ngram_range=(1,2), stop_words=<english + 4 extra>, max_features=5000, sublinear_tf=True)`. The `max_features=5000` cutoff was directly investigated (see §13): the uncapped vocabulary is 9,545 terms, and **every single dropped term has a corpus-wide document frequency of exactly 1** — meaning the cap never discards a term with any repeated real-world support, only arbitrarily thins the large pool of singleton terms. This is why simply raising `max_features` was tested and rejected as a fix for under-represented vocabulary (it added more noise, not more signal — see §13).

### 7.3 Model Training (`train_model.py`)
`LogisticRegression(max_iter=2000, class_weight="balanced", C=500)` wrapped in `CalibratedClassifierCV(cv=3, method="sigmoid")`. Key facts, all directly verifiable in the code and its comments:
- **`class_weight="balanced"`** gives every class an equal *total* weight contribution to the loss (`n_samples / n_classes`, a constant), regardless of how many raw rows that class has — this is why the leakage fix's ~4× reduction in total row count didn't change *relative* class balance, only the absolute weight budget (a fact directly measured during this engagement, see §13).
- **`C=500`** was chosen via a documented, leakage-free grid search (C ∈ {1,3,10,30,100,300,500,1000,2000,5000,10000}) evaluated on accuracy, macro F1, weighted F1, and log loss — log loss bottomed out at C=500 (0.3294) with accuracy/macro-F1 peaking at C=500–1000 and a confirmed overfitting decline by C=2000. C=500 was picked over the very-slightly-better C=1000 because it is simultaneously near-optimal on every metric rather than trading one for a marginal gain in another.
- **`cv=3`** (reduced from the sklearn default of 5): required because, after duplicate removal, the smallest class (Oral Ulcer (Canker Sore), 6 total examples) cannot support a 5-way internal calibration split — verified by direct reproduction of the `ValueError` sklearn raises otherwise.
- **Sigmoid, not isotonic, calibration**: isotonic calibration was tried and rejected (per the module's own docstring) — with 42 classes this heavily separable, isotonic regression produced degenerate step-function curves that fabricated high confidence scores for classes the raw model didn't actually favor.
- **Cross-validation methodology**: `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`, with the TF-IDF vectorizer **refit inside each fold** (no IDF-weight leakage from the held-out fold), run once on the free-text-only subset (comparable to an earlier, smaller 24-class baseline) and once on the full combined dataset (what actually ships).

### 7.4 Model Saving
`joblib.dump()` of the fitted `CalibratedClassifierCV` instance to `disease_model.pkl` and the fitted `TfidfVectorizer` to `vectorizer.pkl`, both in `packages/backend/ml/`. The final artifact is fit on 100% of the available (deduplicated) data — the cross-validation splits exist only to measure generalization, not to withhold data from what ships.

### 7.5 Prediction Pipeline (`predict.py`)
Invoked as `python predict.py "<raw symptom text>"`, printing one JSON object to stdout. Full sequence:
1. Load `disease_model.pkl`, `vectorizer.pkl`, `doctor_map.json`, `Symptom-severity.csv` (via `load_severity_weights()`), `symptom_precaution.csv`, `symptom_Description.csv`.
2. Lowercase + whitespace-collapse the raw input → `symptoms_lower` (used by severity scoring and emergency detection, deliberately **not** the synonym-normalized text — see §7.7).
3. Vectorize `normalize_symptom_text(raw_input)` (the *other*, synonym-normalized copy) and get `model.predict_proba()`.
4. `determine_severity()`: first builds the list of canonical `Symptom-severity.csv` phrases (plus their synonyms) actually found in the raw text — this same list is then reused for two purposes rather than matched twice: (a) summed by weight and compared against three thresholds (`MODERATE`≥7, `SEVERE`≥15, `CRITICAL`≥22) to set a severity *level*, and (b) returned as-is as the `symptomsDetected` symptom-extraction output (§7.12). If `check_emergency()` (from `emergency.py`) is true, severity is hard-set to `CRITICAL` and the emergency flag is `True` — but the matched-symptom list computed just above is still returned, so an emergency result still shows what was detected rather than an empty list. The statistical severity level can **never** itself flip the emergency flag; only `check_emergency()` can (a bug fix specifically recorded in §13 — a Pneumonia-pattern input used to trip the statistical threshold and get mislabeled as an emergency purely by symptom-count coincidence).
5. If `emergency` is true, the disease/doctor output is overridden to a fixed `"Emergency — seek immediate medical attention"` string, computed *after* the classifier ran (so the classifier's own top-3 differentials are still available for the explanation output, even though they aren't the headline result).
6. Otherwise, if the top class's calibrated probability is below `CONFIDENCE_ABSTAIN_THRESHOLD = 0.25`, the output is `"Uncertain — please consult a doctor for evaluation"` rather than a specific (possibly wrong) disease name.
7. Otherwise, the top predicted class is shown, with its doctor recommendation, description, and precautions looked up from the respective CSV-derived dictionaries.
8. `explain_prediction()` builds a structured `explanation` object: which vocabulary terms in the query actually matched, and for each of the top-3 differentials, its top-5 contributing terms (TF-IDF weight × the class's own logistic-regression coefficient, averaged across the calibration model's 3 internal fold estimators) plus a human-readable "selected because..."/"ranked below X because..." sentence.

### 7.6 Confidence Score
The number shown to the user is `model.predict_proba()`'s value for the top class, expressed as a percentage — i.e., a genuinely *calibrated* probability (via `CalibratedClassifierCV`'s sigmoid recalibration of the underlying `LogisticRegression`'s raw scores), not the raw, typically overconfident logistic output.

### 7.7 Severity Scoring
Implemented by `determine_severity()` using a phrase dictionary built from `Symptom-severity.csv`'s 131 symptoms plus 20 hand-curated synonym phrases (`SEVERITY_SYNONYMS` in `predict.py`, e.g. `"headache"` also matches `"head ache"`/`"head hurts"`). Every matched phrase's weight is summed. **Two defects in this specific mechanism were found and documented during this engagement but not yet fixed in code** (see §17 for full detail, since the user's most recent instruction to this engagement was to trace and report, not to modify):
- The phrase for `toxic_look_(typhos)` can never match any realistic user input, due to a regex word-boundary interaction with its trailing parenthesis.
- Three phrase pairs (`itching`/`internal itching`, `joint pain`/`hip joint pain`, `stiff neck`/`neck pain`'s `stiff neck ache` synonym) can double-count, since one phrase is a literal substring of the other and the summation has no mutual-exclusion logic.

### 7.8 Emergency Detection (`emergency.py`)
A deliberately separate, disease-specific weighted-category system — **not** a keyword trigger. Symptom concepts (e.g. `chest_pain`, `left_arm_pain`, `severe_shortness_of_breath`) are matched via phrase regexes, then summed per category (`heart_attack`, `stroke`, `respiratory`, `other`), each with its own independent threshold. A category only "fires" when its total crosses its threshold — e.g. bare chest pain alone (weight 2) cannot trigger the heart-attack category (threshold 4) without a companion sign like left-arm pain (weight 3) or cold sweat. This design was arrived at after two earlier, simpler designs were found and rejected during this engagement (a plain keyword trigger, then a flat cross-category score) — both produced verified false positives or false negatives, documented in §13.

### 7.9 Doctor Recommendation
Two-stage: (1) `predict.py`'s `resolve_doctor()` maps the predicted disease (or a keyword fallback) to a specialist *title* string via `doctor_map.json`; (2) `python.service.ts`'s `resolveDoctorId()` maps that title to a real, currently-available `Doctor` row in Postgres, falling back to any available General Physician, and finally to `null` if literally no doctor of any kind is available.

### 7.10 Normalization & Synonym Handling
Two **deliberately separate** synonym systems exist, and the codebase's own comments explain why they must never be merged: `text_normalize.py`'s `SYMPTOM_SYNONYMS` normalizes the text that reaches the *classifier* (11 canonical entries), while `predict.py`'s `SEVERITY_SYNONYMS` normalizes matching for the *severity scorer* (20 entries) — operating on the raw, un-normalized text, because severity/emergency scoring must match exactly what the user typed, not a paraphrase-canonicalized version of it. `emergency.py` maintains a third, fully independent concept-phrase dictionary for the same reason.

### 7.11 Phrase Matching
All three systems above share one utility, `phrase_matching.py`'s `compile_phrase_alternation(phrases)` — `re.compile(r"\b(?:" + "|".join(re.escape(p) for p in phrases) + r")\b")`. This was extracted specifically to eliminate a three-way code duplication where the same regex-compilation expression had been written independently in `emergency.py`, `text_normalize.py`, and `predict.py`.

### 7.12 Symptom Extraction Layer
`determine_severity()` in `predict.py` doubles as a lightweight symptom-extraction layer: the same phrase-match pass it already ran to compute a severity score (§7.7) is also returned, verbatim, as a human-readable `symptomsDetected` list (e.g. `["Chest pain", "Cough", "Fever"]`) rather than being matched a second time by separate code. This is deliberately rule-based against `Symptom-severity.csv`'s 131-symptom canonical vocabulary (plus its synonyms) — not an LLM call — for three concrete reasons: (1) it reuses an already-verified, already-tested matcher instead of introducing a second, independent symptom vocabulary to keep in sync; (2) it has zero added latency or external dependency, unlike an LLM-assisted extractor; (3) its output is deterministic and directly traceable to a specific regex match, consistent with the same explainability rationale that keeps the classifier itself as TF-IDF + LogisticRegression rather than a black-box model (§7.14, §12).

One deliberate exception: a bare, unqualified "fever" (no "high"/"mild" qualifier) internally borrows `Symptom-severity.csv`'s "mild fever" weight so it isn't scored as zero, but is displayed to the user as the generic "Fever" they actually said — the more specific "Mild fever" label is only ever shown when the user's own text contained a genuine mild-severity qualifier (`"low grade fever"`, `"slight fever"`, etc.), not merely inferred from an unqualified mention.

Plumbed end-to-end: `predict.py`'s `symptomsDetected` field → `PythonPredictionResult.symptomsDetected` (`python.service.ts`) → `ai.controller.ts`'s response body → `AnalyzeSymptomsResult.symptomsDetected` (frontend type) → a checkmarked list rendered in `SymptomChecker.tsx` directly under the diagnosis description, alongside confidence, the top-3 differentials, and the emergency banner (all four already existed independently; matched symptoms was the one genuinely missing display element, verified by reading the component in full before adding anything).

### 7.13 Confusion Matrix / Weak-Disease Analysis
Rather than trusting the aggregate CV accuracy/macro-F1 numbers alone (98.19% / 0.9844 on the current, post-gretelai-merge training corpus — §13), a full leakage-free confusion matrix was generated (same `StratifiedKFold` methodology as `train_model.py`'s `cross_validate()`) to find which *specific* disease pairs the aggregate number was hiding. Total correct: 2,443/2,488. The confused pairs, sorted by count:

| Pair | Count |
|---|---|
| Chicken pox → Dengue | 6 |
| Dengue → Typhoid | 4 |
| Psoriasis → Impetigo | 3 |
| Pneumonia → Bronchial Asthma | 3 |
| Peptic ulcer diseae → GERD | 3 |
| Dengue → Chicken pox | 3 |
| Diabetes → Drug Reaction | 2 |
| Allergy → Common Cold | 2 |
| (18 further pairs, each count 1) | 1 each |

**Chicken pox ↔ Dengue is the single largest confusion (9 combined occurrences)** and was investigated directly rather than left as a raw number. Root cause (verified by direct vocabulary-overlap grep against the training corpus, not assumed): `"red spots"`/`"rash"`/`"fever"` are heavily shared between the two diseases' training text; Dengue's genuinely distinguishing term, `"joint pain"`, is present in 19/107 Dengue rows but 0/59 Chicken pox rows and is currently under-leveraged; Chicken pox's own textbook-distinguishing terms, `"blister"`/`"fluid-filled"`, are **entirely absent** from its 59 training rows (0 occurrences) — the exact same gap already documented in §17. Adding blister/fluid language to Chicken pox's training text was considered and rejected: that exact vocabulary is already **exclusively owned by Impetigo** (21+3 rows use it) in the current corpus, so adding it to Chicken pox would not fix this confusion — it would recreate the identical contamination-trap pattern already observed once before in this engagement (§13's Drug-Reaction/itching case), this time colliding with Impetigo instead of Dengue. **No safe fix exists without new, correctly-labeled training data** containing genuine blister-vocabulary Chicken pox descriptions; this is recorded as a known limitation (§17), not silently patched around.

The two example pairs from the original ask were also checked directly rather than assumed: **Common Cold ↔ Allergy** is real (2–3 occurrences) and matches the already-documented genuine clinical ambiguity between the two (§17) — both conditions share near-identical rhinitis vocabulary in the actual training data. **Migraine ↔ Hypertension** is real but negligible (1 occurrence each direction). **Drug Reaction ↔ Chicken pox**, the third originally-cited pair, is now **zero** — already fixed earlier in this engagement by the gretelai-derived training-data merge (§13).

### 7.14 Sentence-Transformer Experimental Comparison
An experimental branch (`packages/backend/ml/experimental/sentence_transformer_experiment.py`) replaces TF-IDF with `all-MiniLM-L6-v2` sentence embeddings, feeding the same downstream `LogisticRegression(C=500, class_weight="balanced")` used in production — isolating the *representation* as the only changed variable, rather than confounding it with a different classifier too. It runs entirely separately from `train_model.py`/`predict.py` and does **not** touch `disease_model.pkl`/`vectorizer.pkl` — production remains TF-IDF + LogisticRegression regardless of this experiment's outcome, per the explicit instruction that started this work.

**Methodology**: both pipelines are evaluated on the *exact same* `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` fold assignments, in the same script run, so the comparison is apples-to-apples rather than two numbers from two separate runs. TF-IDF is refit inside each fold (as `train_model.py` already does, to avoid IDF-weight leakage). Sentence embeddings carry no equivalent leakage risk and are encoded once, up front, for the whole dataset — `all-MiniLM-L6-v2` is a frozen pretrained encoder, never fit to this dataset at all, so there is nothing for a held-out fold to leak into.

**Result** (2,488 rows, 42 classes, same corpus §7.13's confusion matrix was generated from):

| Pipeline | Accuracy | Macro F1 | Log loss | Fit+predict time (5 folds) |
|---|---|---|---|---|
| TF-IDF + LogisticRegression (shipped) | 98.11% (±0.41pp) | 0.9791 (±0.0116) | 0.0824 | 8.8s |
| all-MiniLM-L6-v2 + LogisticRegression (experimental) | 97.75% (±0.61pp) | 0.9807 (±0.0133) | 0.0707 | 2.5s |

The two pipelines are **statistically indistinguishable** on this dataset — every metric's difference is well within the other's fold-to-fold standard deviation. Embeddings encode faster per-fold once computed (dense 384-dim vectors vs. sparse 5000-dim TF-IDF) but pay a one-time ~218-second up-front encoding cost for the full corpus that TF-IDF does not incur at all. **Decision: keep TF-IDF + LogisticRegression in production.** With no measurable accuracy advantage from embeddings, there is no case for giving up the one concrete capability TF-IDF uniquely affords here: `explain_prediction()`'s exact per-term coefficient breakdown (§7.5 step 8, §12). A frozen sentence embedding's 384 dimensions have no comparably direct per-word explanation — "why this disease" would degrade from an exact arithmetic decomposition to, at best, a post-hoc approximation (e.g. LIME/SHAP), which was out of scope to build and evaluate as a replacement for something already working.

### 7.15 Limitations of the AI/ML Implementation
See §17 for the complete, itemized list (rare-class data scarcity, 17 diseases with zero free-text coverage, the two severity-matching defects above, the residual 2/28 regression-suite failures and their root causes, the Chicken pox ↔ Dengue confusion pair's unresolved contamination-trap conflict with Impetigo, and the classical-ML-vs-embeddings tradeoff now backed by a direct experimental comparison).

---

## 8. Database Design

### 8.1 PostgreSQL — the live data layer

Schema source: `packages/backend/sql/schema.sql`, whose own header states it was reverse-engineered from the queries the controllers actually run (no schema file existed in the repository before it). Entity-relationship summary:

```
Patient (patientID PK) ─┬─< Report (patientID FK, doctorID FK→Doctor, nullable)
                          ├─< AppointmentSlot (patientID FK, doctorID FK→Doctor)
                          ├─< MedicalHistory (patientID FK)
                          ├─< NotificationLog (patientID FK)
                          ├─< EmergencyAlert (patientID FK)
                          ├─< SymptomAnalysisLog (patientID FK, NULLABLE — null for guests)
                          ├─< Feedback (patientID FK, doctorID FK→Doctor, nullable)
                          └─< SessionLog (patientID FK, doctorID FK, both nullable)

Doctor (doctorID PK) ─┬─< Report.doctorID
                       ├─< AppointmentSlot.doctorID
                       ├─< Feedback.doctorID
                       └─< SessionLog.doctorID
```

| Table | Primary Key | Foreign Keys | Notable columns |
|---|---|---|---|
| `Doctor` | `doctorID` (SERIAL) | — | `email` UNIQUE, `specialization`, `is_available`, `is_active` |
| `Patient` | `patientID` (SERIAL) | — | `email` UNIQUE, `blood_group`, `last_appointment_date` |
| `Report` | `reportID` | `patientID`→Patient (CASCADE), `doctorID`→Doctor (SET NULL) | `status` CHECK IN (PENDING, REVIEWED, COMPLETED); `ai_diagnosis`, `ai_confidence`, `doctor_diagnosis` |
| `AppointmentSlot` | `slotID` | `doctorID`→Doctor (CASCADE), `patientID`→Patient (CASCADE) | `status` CHECK IN (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW) |
| `MedicalHistory` | `historyID` | `patientID`→Patient (CASCADE) | Append-only free-text log |
| `NotificationLog` | `notificationID` | `patientID`→Patient (CASCADE) | `is_read` boolean |
| `EmergencyAlert` | `alertID` | `patientID`→Patient (CASCADE) | `severity` |
| `SymptomAnalysisLog` | `logID` | `patientID`→Patient (SET NULL, nullable) | `input_type` CHECK IN (TEXT, VOICE) |
| `Feedback` | `feedbackID` | `patientID`→Patient (CASCADE), `doctorID`→Doctor (SET NULL) | `rating` CHECK BETWEEN 1 AND 5 |
| `SessionLog` | `sessionID` | `patientID`→Patient (CASCADE), `doctorID`→Doctor (CASCADE) | Per the schema file's own comment, **nothing in the codebase currently inserts a row here** — only `auth.controller.ts`'s `logout` conditionally updates one if a `sessionId` happens to be supplied |

A PL/pgSQL function, `fn_CalculateSeverityScore(p_patient_id INTEGER)`, returns `'CRITICAL'` if the patient has an `EmergencyAlert` within the last 30 days, else their most recent `SymptomAnalysisLog.severity`, else `'MILD'` — called directly by `patient.controller.ts`'s `getStats`.

**Data flow example** (symptom analysis → history): `ai.controller.ts` writes to `Report`, `MedicalHistory`, and conditionally `EmergencyAlert` in the same request that produced the AI prediction; `patient.controller.ts`'s `getHistory` later reads all of `Patient` + `MedicalHistory` + `Report` (joined to `Doctor`) + `AppointmentSlot` (joined to `Doctor`) in four parallel queries (`Promise.all`) to build the patient's full timeline.

Seed data: 10 doctors, one per specialization the keyword-fallback map can resolve to, all with the same bcrypt-hashed password (`Doctor123!`), inserted idempotently (`WHERE NOT EXISTS`).

### 8.2 MongoDB — connected, but not part of the live data flow
One Mongoose model, `Patient.model.ts`: an `IPatient` document with embedded sub-document arrays for medical history, report summaries, and appointment summaries, its own `pre('save')` bcrypt hook, and its own `comparePassword()`/`generateToken()` instance methods (the latter signs its own JWT independently of `utils/token.util.ts`). **This model is not imported by any controller or service** — it exists, is fully built and independently tested (via `mongodb-memory-server`), but has no route that reads or writes it. See §17 for the implication of this.

### 8.3 Redis
No schema (key-value cache). `utils/redisClient.ts` exposes `cacheGet`/`cacheSet`/`cacheDel`/`cacheGetJSON`/`cacheSetJSON`, all wrapped to never throw if Redis is unreachable. An env var `PREDICTION_CACHE_TTL_SECONDS` exists specifically for caching AI predictions, but **no call site in `ai.controller.ts` or `python.service.ts` actually invokes a cache read or write** — the caching layer for predictions is provisioned but not wired up.

---

## 9. Authentication System

### 9.1 Registration
`POST /auth/signup` → `authController.signup` → `authService.registerPatient`: checks for an existing Postgres `Patient` row with the same email (409 if found), hashes the password with `bcrypt.hash(password, 10)` (hardcoded salt-round constant in `auth.service.ts`), inserts the row, and returns a token pair immediately (no email verification step exists anywhere in the codebase).

### 9.2 Login
`POST /auth/login` → `authController.login` → `authService.loginUser(email, password, role)`: looks up the correct table (`Patient` or `Doctor`) based on the requested `role`, returns 401 for an unknown email, checks `is_active` and returns 403 *before* even calling `bcrypt.compare` if the account is deactivated (verified by a dedicated unit test asserting `bcrypt.compare` is never invoked in that branch), then verifies the password and issues a token pair.

### 9.3 Guest Login
`POST /auth/guest` → `authController.guestLogin`: issues a token pair with **no database access whatsoever** — a guest identity is entirely stateless.

### 9.4 JWT
Two secrets, two lifetimes, both Zod-validated with defaults in `config/env.ts`: `JWT_SECRET` (access token, default expiry `15m`) and `JWT_REFRESH_SECRET` (refresh token, default expiry `7d`). Production boot explicitly refuses to start if either secret still contains the literal substring `"change-me"` (a fail-safe against deploying with the default dev secret). Signing/verification use `jsonwebtoken`'s default algorithm (HS256, since no explicit `algorithm` option is passed). `utils/token.util.ts` centralizes `signAccessToken`/`signRefreshToken`/`verifyAccessToken`/`verifyRefreshToken`/`issueTokenPair`; refresh tokens carry a `type: 'refresh'` claim that `refreshToken()` explicitly checks so an access token can't be replayed as a refresh token.

### 9.5 Password Hashing
`bcrypt` (`^6.0.0`), cost factor 10 in two independent places: a hardcoded constant in `auth.service.ts` (the live Postgres path) and the Zod-validated, env-configurable `BCRYPT_SALT_ROUNDS` (default 10, range 4–15) used by the dormant `Patient.model.ts`'s pre-save hook.

### 9.6 Protected Routes
Backend: `authenticate` (hard-reject) vs. `optionalAuthenticate` (soft, guest-compatible) middleware, plus `authorize(...roles)` for role checks — see §6.4. Frontend: `ProtectedRoute.tsx` component wrapper plus `useRequireAuth`/`useRequireRole` hooks — see §5.6.

### 9.7 Roles
Exactly three role values are recognized end-to-end: `patient`, `doctor`, `guest` (verified in `types/express/index.d.ts`'s `UserRole` type and every `allowedRoles` array across the route files). No `admin` role exists anywhere in the codebase, despite `packages/backend/README.md` referencing an "Admin" scope for one feedback endpoint — this is a documentation/code mismatch (see §17).

### 9.8 Authorization Gaps (verified)
`doctor.controller.ts`'s `getPatientDetail`/`addPatientNote` are gated by `assertTreatmentRelationship` — a check that the requesting doctor has an existing `Report` or `AppointmentSlot` with that specific patient, preventing a doctor from browsing arbitrary patients' records. No equivalent ownership check pattern was found missing elsewhere in the reviewed controllers.

---

## 10. API Documentation

Base path: `API_PREFIX` (default `/api/v1`). All request/response bodies are JSON. Authentication column states the middleware chain verified directly from each route file.

### `/auth`
| Method | Path | Purpose | Request body | Auth |
|---|---|---|---|---|
| POST | `/signup` | Register a patient | `{name,email,password,phone?,dateOfBirth?,bloodGroup?}` | None (rate-limited: `authLimiter`) |
| POST | `/login` | Login (patient or doctor) | `{email,password,role?}` | None (`authLimiter`) |
| POST | `/guest` | Start a stateless guest session | — | None (`authLimiter`) |
| POST | `/refresh` | Exchange a refresh token for a new access token | `{refreshToken}` | None |
| POST | `/logout` | Close a session (no-op unless `sessionId` supplied) | `{sessionId?}` | Required |
| GET | `/me` | Get the current authenticated user | — | Required |

### `/ai`
| Method | Path | Purpose | Request | Auth |
|---|---|---|---|---|
| POST | `/analyze` | Run symptom analysis | `{symptoms, inputType?}` | Optional (guests allowed; `aiAnalysisLimiter`) |
| GET | `/education/:topic` | Static education article | — | None |
| GET | `/doctor/:diagnosis` | Specialist lookup for a free-text diagnosis | — | None |
| GET | `/history` | The authenticated patient's past analyses | — | Required, patient only |

### `/patient` (singular — the authenticated patient's own data)
Router-level guard: `authenticate` + `authorize('patient')` on every route.
| Method | Path | Purpose |
|---|---|---|
| GET/PUT | `/profile` | Get/update own profile |
| GET | `/history` | Full aggregated history |
| GET | `/reports` | Own AI reports |
| GET | `/stats` | Dashboard counts + computed severity score |
| GET | `/notifications` | Own notifications |
| PUT | `/notifications/:id` | Mark one notification read |

### `/doctor` (singular — the authenticated doctor's own data)
Router-level guard: `authenticate` + `authorize('doctor')` on every route.
| Method | Path | Purpose |
|---|---|---|
| GET/PUT | `/profile` | Get/update own profile |
| GET | `/reports/pending`, `/reports/reviewed` | Report queues |
| POST | `/reviews` | Submit a review for a report |
| GET | `/appointments` | Own appointments |
| PUT | `/availability` | Toggle availability |
| GET | `/stats` | Dashboard counts |
| GET | `/patients/:id` | A specific patient's detail (gated by treatment relationship) |
| POST | `/patients/:id/notes` | Add a note to a patient (same gate) |

### `/doctors` (plural — public directory)
| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/` | Search/browse available doctors (`?search=&specialization=`) | None |

### `/appointments`
| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/available-slots` | Free 30-min slots for a doctor/date | None |
| POST | `/book` | Book a slot | Patient (`writeLimiter`) |
| PUT | `/:id/cancel` | Cancel (owning patient or assigned doctor) | Required |
| GET | `/patient` | Own appointments | Patient |
| GET | `/doctor` | Own appointments | Doctor |
| PUT | `/:id/status` | Update status | Doctor (own appointments only) |

### `/feedback`
Router-level guard: `authenticate` (any role).
| Method | Path | Purpose |
|---|---|---|
| GET | `/stats` | Aggregate rating stats |
| POST | `/submit` | Submit feedback (1-hour dedup window per patient) |
| GET | `/:id` | One feedback entry (owning patient or any doctor) |

### Endpoints the frontend calls that do **not** exist on the backend (verified by cross-referencing every route file against every frontend `lib/endpoints/*.ts` call)
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- Any OAuth route (`AuthCallback.tsx` expects one; none exists)

(Note: earlier drafts of the frontend code contain comments claiming `GET /doctor/patients/:id`, `POST /doctor/patients/:id/notes`, and `GET /doctors` also don't exist — this report verified those comments are **stale**: all three routes exist and match the frontend's expected contract exactly, per direct inspection of `doctor.routes.ts` and `doctors.routes.ts`.)

---

## 11. Complete Project Workflow

```
User opens app
    ↓
Chooses: Login (patient/doctor) | Signup (patient) | Continue as Guest
    ↓
[If Signup] POST /auth/signup → Patient row created (Postgres) → tokens issued
[If Login]  POST /auth/login  → credentials verified → tokens issued
[If Guest]  POST /auth/guest  → stateless tokens issued, no DB write
    ↓
Tokens stored (localStorage if "remember me", else sessionStorage)
    ↓
Redirected to role home: patient → "/", doctor → "/doctor", guest → "/guest" → "/symptom-checker"
    ↓
Patient/guest enters symptoms (text or voice) on SymptomChecker.tsx
    ↓
POST /ai/analyze  (optionalAuthenticate — works with or without a token)
    ↓
Backend validates (Zod: 3–2000 chars) → spawns predict.py as a child process
    ↓
predict.py: normalize → TF-IDF classify → severity score → emergency check
    ↓
    ├─ Emergency detected → override to "Emergency" label, severity=CRITICAL
    ├─ Confidence < 25%    → "Uncertain — please consult a doctor"
    └─ Otherwise           → predicted disease + confidence + differentials
    ↓
Backend resolves a real, available Doctor row for the recommended specialization
    ↓
[If authenticated patient] INSERT Report, MedicalHistory, (EmergencyAlert if applicable)
[Always]                    INSERT SymptomAnalysisLog (patientID null for guests)
    ↓
JSON response returned to frontend → rendered with severity-coded UI
    ↓
[Patient, optional next steps]
    ├─ Book an appointment with the recommended doctor → POST /appointments/book
    ├─ View full history → GET /patient/history
    └─ Leave feedback → POST /feedback/submit
    ↓
[Doctor side, independently]
    Doctor logs in → sees pending reports (GET /doctor/reports/pending)
    ↓
    Reviews a report, adds diagnosis/notes/prescription → POST /doctor/reviews
    ↓
    Report status → REVIEWED, MedicalHistory + NotificationLog updated
    ↓
    Patient sees the updated report and a real-time notification (Socket.IO)
```

---

## 12. Design Decisions

Every claim in this section is grounded in an explicit code comment or a directly observable architectural fact — not inferred motive.

- **React over alternatives**: no code evidence states this explicitly (no comment discusses Angular/Vue as rejected alternatives); the only verifiable fact is that React 18 plus the specific ecosystem choices (Vite, React Router, Zustand for one store) form a coherent, currently-standard stack. This report does not claim to know why React specifically was chosen over Angular, since no such comparison exists in the source.
- **Vite over Create React App**: verified by the presence of `vite.config.ts`, `@vitejs/plugin-react`, and the absence of any CRA scaffolding (`react-scripts` is not a dependency).
- **Vitest over Jest for the frontend**: explicitly documented in `vitest.config.ts`'s own comment — Jest cannot natively parse `import.meta.env` without extra shims, and the project needed that syntax for `src/config/env.ts`.
- **Jest over Vitest for the backend**: the reverse choice, for the backend package — `jest.config.js` with `ts-jest` is the configured runner even though Vitest packages are also listed in `package.json`. No comment explains this asymmetry; it is stated here as an observed inconsistency rather than a justified decision (see §17).
- **Zod for validation on both frontend and backend**: gives the team one validation mental model across the stack, though schemas are hand-duplicated (not shared as code) between the two packages.
- **Express over alternatives (e.g. Fastify, NestJS)**: no comparative comment found; Express's minimal, middleware-centric model is a plausible fit for the relatively flat controller/service structure actually implemented.
- **PostgreSQL as the live data store, with a parallel, unused MongoDB migration path**: `config/database.ts`'s own comment states the intent directly — *"the legacy PostgreSQL pool still lives in `./db.ts` while controllers are migrated over. New data access should go through Mongoose models."* This documents an *intended* migration that had not progressed past building one Mongoose model at the time of this report (see §17 for the implications).
- **Classical ML (TF-IDF + Logistic Regression) over embeddings/transformers for disease classification**: directly documented in `train_model.py`'s module docstring and reinforced by the separate, unwired `rag-service` prototype's existence — the classical approach was kept specifically because it supports exact, per-term coefficient explanations (`explain_prediction()`'s "why this disease was selected" output), which a black-box embedding model would not straightforwardly provide. This was upgraded from an assumed to a directly evidenced decision via the `all-MiniLM-L6-v2` experimental comparison in §7.14: the two representations are statistically indistinguishable on accuracy/macro-F1/log loss on this dataset, so there was no accuracy case to trade explainability away for.
- **Rule-based (not LLM-assisted) symptom extraction**: `determine_severity()`'s existing phrase matcher was extended to also emit a `symptomsDetected` list rather than adding a separate LLM-based extractor — reuses an already-verified matcher instead of a second symptom vocabulary, adds no latency or external API dependency, and keeps every extracted symptom traceably tied to an exact regex match rather than an opaque model call. Full detail in §7.12.
- **Sigmoid over isotonic calibration**: isotonic was tried and produced degenerate, overconfident curves for classes the raw model didn't actually favor — documented in the module docstring, and reproducible from the codebase's own historical record of this decision.
- **`C=500` for the logistic regression's regularization**: chosen via a documented grid search over leakage-free cross-validation, not a default or a guess — full detail in §7.3 and §13.
- **JWT for authentication over server-side sessions**: enables the stateless guest mode (no database row needed at all) and avoids a session store for the access token, at the cost of the refresh-token rotation complexity implemented in `src/lib/api.ts`'s interceptor.

---

## 13. Challenges Solved

This section is explicitly grounded in two verifiable sources: (1) in-source code comments that document a specific prior failure mode and the fix applied for it, and (2) a substantial engineering engagement on this exact codebase whose outputs (the current code, its comments, and its test results) are what this report is auditing. As stated at the top of this report, the repository's Git history is a single commit, so no "before/after" commit comparison was possible — the evidence below is the current code's own record of what it replaced.

1. **Cross-validation leakage from duplicate training rows.** `dataset.csv`'s 4,920 rows collapsed to ~303 truly unique symptom combinations; because `StratifiedKFold` splits by row index, an exact duplicate could land in one fold's training set and another fold's validation set, letting the model "validate" on text it had just trained on. This was fixed by deduplicating each data source in `load_data()` before any split occurs — verified directly to bring reported cross-validation accuracy down from an inflated 99% to an honest ~96–98%, and confirmed via a direct check that zero duplicate text exists in any fold's train/validation split post-fix.
2. **Regularization strength needing re-tuning after the leakage fix.** Removing duplicates shrank `class_weight="balanced"`'s total per-class weight budget by the same ~4× factor the row count shrank by, making the previous `C=1` regularization strength relatively much stronger than before and causing genuine underfitting (measured: log loss 1.51 at C=1 immediately post-fix). A leakage-free grid search identified `C=500` as the corrected value, recovering — and on some metrics exceeding — the pre-fix (leakage-inflated) performance honestly.
3. **A rare-class calibration crash.** After deduplication, `CalibratedClassifierCV`'s default `cv=5` internal split became infeasible for the smallest class (6 examples) — reduced to `cv=3` after confirming this change alone resolves the crash without degrading calibration quality.
4. **Emergency detection false positives/negatives across three design iterations**, as recorded in `emergency.py`'s own module docstring: a plain keyword trigger (e.g. any mention of "chest pain") produced false positives on non-emergency presentations like GERD; a flat, single cross-category score then produced a false negative on a classic Pneumonia presentation (fever+cough+chest pain+phlegm) by allowing generic symptoms to sum toward a threshold meant for genuine cardiac emergencies. The current disease-specific, per-category weighted design (§7.8) was built to satisfy both known cases simultaneously, and the module docstring explicitly names both as its calibration targets.
5. **A second, hidden emergency-detection bypass.** `determine_severity()`'s purely statistical severity-level score (used only to label MILD/MODERATE/SEVERE/CRITICAL) was found to independently set `emergency=True` whenever the numeric score alone crossed the CRITICAL threshold — completely bypassing `emergency.py`'s rule-based logic. Fixed by decoupling the two: only `check_emergency()` may set the emergency flag; the statistical score may only set the display-level severity.
6. **TF-IDF's exact-token matching missing paraphrases.** A query like "my chest burns after eating" shared almost no vocabulary with a training example phrased "burning chest pain after meals." Solved with `text_normalize.py`'s synonym-canonicalization step, applied identically to training text and every incoming query.
7. **A disproportionately-weighted, non-diagnostic stop word.** Direct coefficient inspection found the word "feel" — appearing broadly across 20+ disease classes' training text — carrying a surprisingly large positive coefficient specifically for Diabetes, causing a near-empty, genuinely non-diagnostic query to clear the confidence-abstention threshold on that word alone. Fixed by adding `feel`/`feeling`/`feels`/`felt` to the vectorizer's stop-word list, verified via leakage-free cross-validation to change overall accuracy/F1 by less than 0.2 points (noise-level) while dropping that specific query's confidence from 25.5% to 7.8%.
8. **Symptom-name formatting inconsistency across two data files**, causing `dataset.csv` and `Symptom-severity.csv` to disagree on the exact spelling of three symptoms (`dischromic_patches`, `foul_smell_of_urine`, `spotting_urination`) due to stray internal whitespace. Both files were audited, a duplicate-conflicting severity weight (`fluid_overload`, appearing twice with weights 6 and 4) was resolved using contextual evidence (both occurrences cluster among the same disease's other hepatic-severity markers), and one non-symptom row (`prognosis` — a leftover source-dataset label-column artifact) was removed.

---

## 14. Security Features

Verified directly from `app.ts` and the middleware files:
- **Helmet** (`^7.1.0`) — sets standard security-related HTTP response headers.
- **CORS** restricted to an explicit origin list (`CORS_ORIGIN` env var, comma-separated).
- **Rate limiting** (`express-rate-limit`), four distinct policies: `generalLimiter` (100 req/60s, applied globally), `authLimiter` (20 req/15min, on signup/login/guest), `analysisLimiter`/`aiAnalysisLimiter` (10 req/60s, on `/ai/analyze`), `writeLimiter` (30 req/60s, on appointment booking).
- **Password hashing** via bcrypt (cost factor 10) — plaintext passwords are never stored.
- **JWT-based stateless auth** with separate access/refresh secrets, short-lived access tokens (15m default), and a production boot-time refusal to start with a default/placeholder secret still in place.
- **Role-based authorization** (`authorize(...roles)`) enforced per-route.
- **Ownership/relationship gating**: `assertTreatmentRelationship` prevents a doctor from viewing or annotating a patient they have no existing appointment or report history with.
- **Input validation** via Zod on every mutating endpoint, rejecting malformed/out-of-range input before it reaches business logic.
- **Centralized error handling** that hides internal error details behind a generic message in production, while still returning structured (non-stack-trace) errors in all environments.

**Not found / explicitly absent** (stated because the report was asked to only mention what actually exists): no CSRF protection middleware, no explicit input-sanitization-against-XSS layer beyond what React's default escaping and Zod's type coercion provide, no account lockout after repeated failed logins (only the generic rate limiter applies), no 2FA/MFA, no audit-log table beyond the append-only `MedicalHistory`/`SymptomAnalysisLog` tables which are not access-controlled beyond normal row-ownership checks.

---

## 15. Performance Optimizations

Verified, concrete optimizations present in the code:
- **Response compression** (`compression` middleware) on all HTTP responses.
- **Code-splitting** on the frontend — every patient/doctor page is `React.lazy()`-loaded, so the initial bundle only includes auth pages and shared chrome.
- **Database connection pooling** — `pg.Pool({max: 20, ...})` for Postgres; Mongoose pool sizing via `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` env vars.
- **Parallelized queries** — `patient.controller.ts`'s `getHistory` runs its four independent queries via `Promise.all` rather than sequentially.
- **Best-effort Redis caching layer** provisioned (`utils/redisClient.ts`) — though, as noted in §8.3, no current call site actually uses it for AI predictions despite a dedicated TTL env var existing for that purpose; this is a provisioned-but-unused optimization, not an active one.
- **TF-IDF vocabulary cap** (`max_features=5000`) bounds feature-space size, keeping the classifier's inference-time matrix small and fast — verified to discard only singleton (document-frequency-1) terms, not genuinely useful vocabulary (§7.2).

**An explicitly documented, deliberate non-optimization**: `predict.py` is invoked as a brand-new child process, reloading `disease_model.pkl`/`vectorizer.pkl` from disk, on *every single request* — the codebase's own comment in `predict.py`'s module docstring states this tradeoff explicitly, describing it as acceptable at the application's current volume and naming a persistent Python sidecar process (e.g. Flask/FastAPI) as the concrete path to revisit if it ever becomes a bottleneck.

---

## 16. Deployment

### 16.1 Containerization
Both application packages are Docker-ized with **multi-stage builds**, verified directly from their Dockerfiles:

- **`packages/backend/Dockerfile`**: four stages — `deps` (install full workspace deps, cached separately from source so edits don't invalidate the npm-install layer) → `build` (compile TypeScript to `dist/`) → `prod-deps` (a second, production-only `npm install --omit=dev`, so `ts-jest`/`eslint`/etc. never ship) → `runtime` (the shipped image). The runtime stage installs **Python 3 + pip into a virtualenv** and `pip install`s `scikit-learn`, `pandas`, `joblib` directly into the image — a concrete, verified confirmation that the Python ML engine is deployed *inside the same container* as the Node backend, not as a separate service. The container runs as a non-root user (`medassist`), uses `dumb-init` as PID 1 for correct signal forwarding, and starts the app via `pm2-runtime start ecosystem.config.js` rather than a bare `node dist/server.js`.
- **`packages/frontend/Dockerfile`**: `deps` → `build` (Vite production build; `VITE_*` variables are passed as Docker build `ARG`s, not runtime env vars, since Vite bakes them into the static bundle at build time) → `runtime`, served by `nginxinc/nginx-unprivileged:1.27-alpine` (a variant that runs as non-root and listens on 8080 by default, avoiding the extra permission work a stock `nginx` image would need).
- Both images define a `HEALTHCHECK` instruction (backend: hits its own `/health` endpoint; frontend: hits `/healthz` on its internal Nginx).

### 16.2 PM2 Process Management (backend)
`packages/backend/ecosystem.config.js` runs the compiled server under PM2 in **fork mode with exactly one instance** — explicitly *not* PM2 cluster mode. The config's own comment states why: `notification.socket.ts` attaches Socket.IO directly to one HTTP server with no Redis adapter configured, so multiple PM2 workers would each hold a disjoint set of socket connections and silently drop cross-worker notification delivery. The documented scaling path is horizontal (more containers behind the Nginx upstream) rather than vertical (more PM2 instances) until a Socket.IO Redis adapter is added. PM2 is configured with `autorestart`, a 400MB memory-restart ceiling, and its own log files kept separate from the app's own Winston-driven log files.

### 16.3 Two Distinct Compose Configurations
| | `docker-compose.yml` (dev) | `docker-compose.prod.yml` |
|---|---|---|
| Services | `mongodb`, `redis`, `backend`, `frontend` | `postgres`, `mongodb`, `mongo-init`, `redis`, `backend`, `frontend`, `nginx` |
| PostgreSQL | **Absent** — a verified gap, since the backend's live data layer is Postgres (§8.1, §17.1) | Present, required, health-checked before the backend starts |
| MongoDB mode | Standalone | A **single-node replica set** (`--replSet rs0`, keyfile-based internal auth, initiated once by the one-shot `mongo-init` service) — required for Mongoose transaction support even though only one Mongo node runs |
| Edge proxy | None — `frontend`'s port is published directly | A dedicated `nginx` container in front of both `backend` and `frontend`, terminating TLS |
| Secrets | Inline defaults (`change_me_in_production`) | Hard failures via Compose's `${VAR:?msg}` syntax if secrets like `DB_PASSWORD`/`JWT_SECRET`/`MONGO_INITDB_ROOT_PASSWORD` aren't supplied |

`docker-compose.prod.yml`'s own header comment states the dual-database requirement explicitly: *"The backend is mid-migration from PostgreSQL to MongoDB... Both databases are therefore required in production until that migration is complete — omitting Postgres here would leave every currently-working endpoint returning 500s."* This independently corroborates the same migration-in-progress finding this report reaches from the application code itself (§6.7, §17.1).

### 16.4 Reverse Proxy (`nginx/nginx.conf`)
Used only in the production compose file. Terminates TLS (`TLSv1.2`/`TLSv1.3`, HSTS and standard security headers), redirects all HTTP to HTTPS except the ACME challenge path (for certbot certificate renewal), and routes by path: `/api/` and `/api/v{n}/auth/` (with its own, tighter `limit_req` rate zone mirroring the backend's own `authLimiter`) to the backend upstream, `/socket.io/` to the backend upstream with WebSocket upgrade headers and a 3600s read timeout for long-lived connections, and everything else to the frontend upstream. Gzip compression is enabled for text/JSON/SVG content types.

### 16.5 Deploy Script and CI/CD Pipeline
`scripts/deploy.sh` (run either manually on the target host or by the GitHub Actions `deploy` job over SSH): fetches and hard-resets to the target git ref, generates the MongoDB replica-set keyfile if missing (`openssl rand -base64 756`, chmod 400 — never committed, per `.gitignore`), builds fresh images, rolls the stack over, and polls a health-check URL before declaring success.

`.github/workflows/deploy.yml` defines three sequential jobs, verified directly:
1. **`test`** — `npm ci` → lint → typecheck → format check → `npm run test:coverage`, with backend and frontend coverage reports uploaded as CI artifacts.
2. **`build`** (needs `test`) — builds both Docker images via `docker/build-push-action`, pushing to GHCR (tagged by commit SHA and `latest`) only on pushes to `main`, not on pull requests — so untested PR images are never published.
3. **`deploy`** (needs `build`, only on push to `main`) — SSHes into the production host (`appleboy/ssh-action`) and runs `scripts/deploy.sh origin/main`, gated behind a GitHub `production` environment (which supports a manual-approval step if configured in the repository's environment settings), followed by a `curl` health-check verification step.

### 16.6 Environment Configuration for Deployment
Every deployment-relevant secret in `docker-compose.prod.yml` uses Compose's required-variable syntax (`${VAR:?error message}`) rather than a silent default — `DB_PASSWORD`, `CORS_ORIGIN`, `MONGO_INITDB_ROOT_USERNAME`/`PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` all fail the `docker compose up` command outright if unset, rather than silently deploying with a development default (a real, verified safeguard against the exact class of mistake — deploying with `change_me_in_production` still in place — that the backend's own `env.ts` boot-time check also guards against independently).

## 17. Limitations

Every item below is a directly verified fact about the current codebase, not a stylistic critique.

### 16.1 Architecture / Data Layer
- **PostgreSQL and MongoDB coexist, but only Postgres is actually used by the API.** MongoDB is required at server boot (the process exits if it can't connect) and has one fully-built Mongoose model (`Patient.model.ts`, with its own auth logic), but no controller or service anywhere in the codebase imports or queries it. This is a genuine, unresolved mid-migration state, not a deliberate dual-database design.
- **The dev `docker-compose.yml` does not provision PostgreSQL at all** (only MongoDB and Redis), despite Postgres being the backend's actual live data dependency — a developer following only that compose file would have a backend that cannot serve any real request. `docker-compose.prod.yml` does include Postgres.
- **`config/db.ts`'s five Postgres connection variables (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`) are read directly off `process.env` with inline fallbacks, bypassing `config/env.ts`'s Zod validation entirely** — every other environment variable in the backend is centrally validated; these five are not.

### 16.2 Documentation/Code Mismatches (verified by direct comparison)
- `README.md` states the database is "MongoDB with Mongoose ODM" — contradicted by every controller's actual Postgres usage.
- `packages/backend/README.md`'s documented API surface (route paths, an "Admin" scope for one feedback endpoint, a MongoDB-collection-based schema section) does not match the real route files, the real three-role system (no `admin` role exists anywhere), or the real Postgres schema.
- `utils/apiResponse.ts`'s actual success-response shape (flat top-level fields) does not match `README.md`'s documented `data`-nested shape.

### 16.3 Dead / Unwired Code (verified by grep — defined but never imported/called)
- `middleware/upload.middleware.ts` — a complete Multer configuration, mounted on no route.
- `utils/validators.ts`'s hand-rolled predicate/assertion helpers — defined and re-exported, but not called from any controller or service.
- `middleware/auth.middleware.ts`'s `requireAuth`/`requirePatient`/`requireDoctor`/`requireGuest`/`ensureSelfOrDoctor` composed guards — defined, not used (routes call `authenticate`/`authorize` inline instead).
- `appointment.validator.ts`'s `cancelAppointmentSchema` — defined, not referenced by any route.
- `PREDICTION_CACHE_TTL_SECONDS` env var and the Redis caching wrappers — provisioned, no call site in the AI prediction path actually uses them.
- `EMERGENCY_NUMBER` env var — exported from `config/env.ts`, not read anywhere else.
- `packages/rag-service/` — a functioning retrieval prototype, entirely disconnected from the live backend.

### 16.4 Testing Gaps
- Backend: only `auth.service`, `Patient.model` (the unused model), and `patient.controller` have tests. `ai.controller`, `appointment.controller`, `doctor.controller`, `feedback.controller`, `auth.controller`, all middleware, `python.service`, `education.service`, and the Socket.IO layer have none.
- Frontend: only the `Button` component, the auth context/hook, and the `Login` page have tests. Every other page, context, and endpoint module has none.
- Both packages set an 80% coverage threshold in their test-runner config while explicitly (frontend) or implicitly (backend) not meeting it with the current test set.
- `playwright` is a frontend devDependency with no corresponding test files or config anywhere — appears to be an unused, placeholder dependency.

### 16.5 ML-Specific Limitations
- **17 of 42 disease classes have zero free-text training examples** — they rely entirely on `dataset.csv`'s structured checkbox data (converted to pseudo-natural-language), which itself reduces to as few as 4–10 truly unique phrasings per class. Real free-text queries for these diseases (e.g. Tuberculosis, Heart attack, several Hepatitis subtypes) are more likely to underperform than the 25 classes with genuine free-text coverage.
- **One class (`Oral Ulcer (Canker Sore)`) has only 6 total training examples**, all from a single small supplementary CSV.
- **Two confirmed, unfixed defects in the severity-scoring phrase matcher** (§7.7): the `toxic_look_(typhos)` phrase can never match any realistic input due to a regex word-boundary edge case; three phrase pairs can double-count a single mentioned symptom because the matcher sums independently-matched phrases with no mutual-exclusion logic.
- **A 28-case hand-written regression suite currently passes 26/28.** The two remaining failures were root-caused (not merely observed): one is genuine real-world ambiguity between two diseases (Common Cold vs. Allergy) that share near-identical rhinitis vocabulary in roughly balanced proportions in the actual training data; the other is a genuine, one-sided vocabulary gap (the Chicken Pox training data never uses the words "fluid" or "blisters," even though that is the textbook description of the condition). Both were confirmed, via direct evidence, to require additional real training data to resolve — not a pipeline or preprocessing fix — and neither was addressed by fabricating synthetic examples, per the explicit constraint against inventing data.
- **Chicken pox ↔ Dengue is the single largest confused pair in a full leakage-free confusion matrix** (9 combined occurrences out of 45 total misclassifications — §7.13), driven by the same underlying blister/fluid vocabulary gap as the regression-suite failure above. Directly verified: that vocabulary is already exclusively "owned" by Impetigo (21+3 training rows) in the current corpus, so adding it to Chicken pox to fix this pair would recreate the same contamination-trap regression already seen once in this engagement, just against a different disease (Impetigo instead of Drug Reaction). No safe code- or preprocessing-level fix exists — only new, correctly-labeled Chicken Pox training data (genuine blister descriptions) would resolve it.
- **The classical-ML-vs-embeddings tradeoff is no longer an assumed decision** — a direct `all-MiniLM-L6-v2` experimental comparison (§7.14), run on the exact same leakage-free CV folds as the shipped model, found the two representations statistically indistinguishable on accuracy (98.11% vs. 97.75%), macro F1 (0.9791 vs. 0.9807), and log loss (0.0824 vs. 0.0707), confirming there is no accuracy-based reason to give up TF-IDF's per-term explainability.
- **No dedicated `requirements.txt`/pinned dependency file exists for `packages/backend/ml/`** — its Python environment's exact library versions are not version-locked in this repository, unlike `packages/rag-service/requirements.txt`. (The new `experimental/sentence_transformer_experiment.py` script has the same property, plus a runtime dependency on a *second*, separate environment — the RAG service's `C:\rag_venv`, which already had `sentence-transformers` installed — since installing `torch`'s license files directly inside this repo's deeply-nested path previously failed against Windows' `MAX_PATH` limit.)

### 16.6 Frontend/Backend Contract Gaps
- Password reset (`forgot-password`/`reset-password`) and OAuth login are implemented in the frontend UI but have no corresponding backend route — these flows are non-functional end-to-end today.

---

## 18. Future Improvements

Presented as realistic, scoped-down next steps directly implied by the limitations above — not speculative feature ideas unconnected to the current code.

1. **Resolve the Postgres/MongoDB duality**: either complete the migration (port every controller to Mongoose models, matching the intent already stated in `config/database.ts`'s own comment) or formally abandon it (remove the Mongoose connection requirement from server boot and delete the unused `Patient.model.ts`) — the current halfway state is the actual risk, not either endpoint.
2. **Add a Postgres service to the dev `docker-compose.yml`** so a fresh clone can actually run the live data layer without manual setup outside Docker.
3. **Move the five Postgres connection variables into `config/env.ts`'s Zod schema** for the same fail-fast validation every other environment variable already gets.
4. **Fix the two identified severity-matcher defects**: correct the `toxic_look_(typhos)` regex boundary issue, and add mutual-exclusion logic (or restructure the phrase list) to prevent the three identified double-counting pairs.
5. **Either wire up or remove** the dead code identified in §17.3 (upload middleware, unused validators, unused auth-guard compositions, the unused cancellation schema, the unused prediction-cache path) — each is a maintenance liability in its current half-built state.
6. **Reconcile `README.md` and `packages/backend/README.md` with the actual implemented API and schema**, or regenerate them from the route/validator source directly to prevent future drift.
7. **Expand test coverage** toward the already-configured 80% threshold, prioritizing the currently-untested controllers (`ai`, `appointment`, `doctor`, `feedback`) given they are the highest-traffic, highest-risk request paths.
8. **Implement the missing auth flows** (password reset, or removal of the corresponding frontend pages/OAuth callback if they are not planned) so the frontend's call surface matches a real backend contract.
9. **Acquire or curate real free-text training examples** for the 17 structured-only disease classes and the single 6-example class, since this report's own investigation confirmed no preprocessing or pipeline change can substitute for genuine additional data there. This now specifically includes **genuine blister/fluid-filled Chicken Pox descriptions** — confirmed by both the regression suite and the confusion matrix (§7.13) to be the single largest fixable gap, and confirmed unfixable by reusing existing vocabulary (it would collide with Impetigo instead).
10. **Pin the ML environment's Python dependencies** in a `requirements.txt` (or equivalent) inside `packages/backend/ml/`, matching the practice already followed in `packages/rag-service/`.
11. **Decide the RAG prototype's fate**: either continue its development toward integration (per `docs/RAG_ARCHITECTURE.md`) or archive it, since it currently exists as unconnected, unmaintained-by-implication code within the same repository.

---

## 19. Conclusion

MedAssist AI is a functioning full-stack medical-symptom-assistant application with a genuinely separable, evidence-driven machine learning core: a classical TF-IDF/Logistic-Regression disease classifier, a rule-based severity scorer, and an independently-designed emergency-detection layer that has been deliberately architected so a single wrong classifier prediction cannot suppress a genuine red-flag warning. The system's frontend (React/TypeScript/Vite/Tailwind) and backend (Express/TypeScript) are conventionally structured and internally consistent within each package, and the API layer implements a broader, more complete set of routes than some of the frontend's own code comments assume — a fact this report specifically verified rather than took on faith from either side's documentation.

At the same time, the codebase carries clear, verifiable evidence of an incomplete architectural transition (PostgreSQL to MongoDB), several pieces of fully-built but unwired functionality (file uploads, a Mongoose patient model, a prediction cache, an entire RAG retrieval prototype), meaningfully uneven test coverage across both packages, and documentation (`README.md` and `packages/backend/README.md`) that has drifted from the code it describes. The machine learning engine specifically has been the subject of an extensive, methodical debugging and tuning process — visible directly in its code comments — that fixed a real cross-validation leakage bug, re-tuned regularization strength with a proper grid search, resolved two independent emergency-detection failure modes, and found (though has not yet fixed) two further defects in the severity-scoring phrase matcher, alongside a rigorously root-caused, honestly-reported pair of residual classification-accuracy limits that stem from genuine gaps in the underlying training data rather than from the pipeline itself.

This report has been constructed to reflect that actual state precisely: verified capabilities are described as capabilities, and verified gaps are described as gaps, with the specific file and, where practical, line-level evidence for each claim given inline. No feature, technology choice, or historical rationale described above was inferred without a corresponding artifact in the source code to point to.
