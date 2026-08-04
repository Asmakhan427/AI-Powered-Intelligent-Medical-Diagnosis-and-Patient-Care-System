# MedAssist AI

Full-stack intelligent medical assistant application.

**Stack**

- Frontend: React 18 + TypeScript + Tailwind CSS (Vite)
- Backend: Node.js + Express + TypeScript
- Database: MongoDB with Mongoose ODM
- Cache / Sessions: Redis
- Real-time: Socket.io
- AI Integration: Python scikit-learn model (invoked as a child process from the backend)

---

## Project Structure

```
medassist-ai/
├── package.json                 # Root workspace config
├── tsconfig.json                # Base TypeScript config
├── .env.example                 # Environment variable template
├── .gitignore
├── docker-compose.yml
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   └── server.ts
│   │   └── ml/                  # disease_model.pkl, vectorizer.pkl, predict.py
│   └── frontend/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── Dockerfile
│       ├── nginx.conf
│       └── src/
└── README.md
```

---

## Prerequisites

- Node.js ≥ 18 (Node 20 LTS recommended)
- npm ≥ 9
- Python 3.8+ with `scikit-learn`, `pandas`, `joblib` (for the AI model)
- MongoDB 7.x (local install or Docker)
- Redis 7.x (local install or Docker)
- Docker & Docker Compose (optional, for containerized setup)

---

## 1. Clone & Install

```bash
git clone <your-repo-url> medassist-ai
cd medassist-ai

# Installs root + both workspaces (frontend & backend) in one pass
npm install
```

This project uses **npm workspaces**, so a single `npm install` at the root resolves and hoists dependencies for both `packages/backend` and `packages/frontend`.

---

## 2. Configure Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` and set real values — in particular:

- `MONGO_INITDB_ROOT_PASSWORD` / `MONGO_URI`
- `REDIS_PASSWORD` / `REDIS_URL`
- `JWT_SECRET` and `JWT_REFRESH_SECRET` (use long, random strings — e.g. `openssl rand -hex 64`)

**Never commit your real `.env` file.** Only `.env.example` is tracked in git.

---

## 3. Train / Place the AI Model

If you already have `disease_model.pkl` and `vectorizer.pkl`, place them in `packages/backend/ml/`.

Otherwise, train from scratch:

```bash
cd packages/backend/ml
pip install scikit-learn pandas joblib
python train_model.py
```

This produces `disease_model.pkl` and `vectorizer.pkl`, used by `predict.py` at inference time.

---

## 4. Local Development (without Docker)

Start MongoDB and Redis locally (or via Docker, see below), then from the project root:

```bash
npm run dev
```

This runs **both** the backend and frontend concurrently:

- Backend (Express + Socket.io) → http://localhost:3000
- Frontend (Vite dev server) → http://localhost:5173

Run them individually if needed:

```bash
npm run dev:backend   # Express API + Socket.io on :3000
npm run dev:frontend  # Vite dev server on :5173
```

---

## 5. Production Build

```bash
npm run build
```

This compiles:

- `packages/backend` → `packages/backend/dist` (via `tsc`)
- `packages/frontend` → `packages/frontend/dist` (via `vite build`)

Then start the compiled backend (which can also serve the built frontend, or run behind nginx):

```bash
npm start
```

---

## 6. Docker Deployment

The `docker-compose.yml` provisions four services: `mongodb`, `redis`, `backend`, `frontend`.

```bash
# Build images and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop and remove containers
docker-compose down

# Stop and also wipe volumes (MongoDB/Redis data)
docker-compose down -v
```

Once running:

- Frontend → http://localhost:5173
- Backend API → http://localhost:3000/api
- MongoDB → localhost:27017
- Redis → localhost:6379

Docker Compose reads variables from your root `.env` file automatically (place it next to `docker-compose.yml`).

---

## Available Scripts (root)

| Script                 | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Run backend + frontend concurrently (dev mode)   |
| `npm run dev:backend`  | Run backend only (nodemon + ts-node)             |
| `npm run dev:frontend` | Run frontend only (Vite dev server)              |
| `npm run build`        | Build backend + frontend for production          |
| `npm start`            | Start the compiled backend in production         |
| `npm test`             | Run backend + frontend test suites               |
| `npm run lint`         | Lint backend + frontend source                   |
| `npm run clean`        | Remove all `node_modules` and `dist` directories |
| `npm run docker:up`    | `docker-compose up --build`                      |
| `npm run docker:down`  | `docker-compose down`                            |

---

## Health & Emergency Notice

This application provides AI-assisted preliminary symptom analysis only and is **not** a substitute for professional medical diagnosis. Any critical/emergency detection routes users to call the local emergency number configured via `EMERGENCY_NUMBER` in `.env` (default: `1122`).

---

## License

MIT
