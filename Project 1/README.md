# IntellMeet

**AI-Powered Enterprise Meeting & Collaboration Platform**

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-blue)](.github/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](#)
[![Stack](https://img.shields.io/badge/stack-MERN%20%2B%20WebRTC-purple)](#)

IntellMeet transforms hybrid meetings into actionable outcomes: real-time video, AI summaries, Kanban task sync, and team analytics — built for the **Zidio Development LogicVeda March 2026** internship submission.

---

## Submission Deliverables

| # | Deliverable | Location |
| :---: | :--- | :--- |
| 1 | **Project Documentation (PDF)** | Submit separately (content summarized in repository / chat) |
| 2 | **Live Public Demo (HTTPS)** | [https://mariam-intellmeet.vercel.app](https://mariam-intellmeet.vercel.app) — deploy via vercel (see below) |
| 3 | **GitHub Repository** | [github.com/mariammgamall/zidio-webdevelopment-internship](https://github.com/mariammgamall/zidio-webdevelopment-internship) |
| 4 | **README** | This file |
| 5 | **Demo Video** | https://drive.google.com/file/d/12t9p4eS0twAdkDG07JhXX69pMtHM26az/view?usp=drive_link |

**Author:** Mariam Gamal Elsayed · ID: ZIDIOXEM8tD · June 2026

---

## Live Demo

**URL:** [https://mariam-intellmeet.vercel.app/](https://mariam-intellmeet.vercel.app/)

> **Note:** The demo URL is live after deploying the backend to Hugging Face Spaces and the frontend to Vercel. Free-tier services may take ~30s to wake on first visit.

No sign-up required for evaluators — use the **"Try Live Demo"** button on the landing page.

| Credential | Value |
| :--- | :--- |
| Email | `mariam@intellmeet.app` |
| Password | `Mariam@1234` |

**Quick evaluator flow:**

1. Open the live URL → click **Try Live Demo**
2. Create or join a meeting from the dashboard
3. Open a second browser/incognito window to test multi-user video + chat
4. End the meeting → view AI summary and action items on the dashboard
5. Visit **Kanban** and **Analytics** from the navigation

Local development: `http://localhost:5173`

---

## Features

| ID | Feature | Description |
| :---: | :--- | :--- |
| F01 | **Auth & Profiles** | JWT + refresh tokens, bcrypt, Google OAuth, Cloudinary avatars, auth rate limiting |
| F02 | **Video Meetings** | WebRTC mesh video, screen share, recording controls, participant presence |
| F03 | **AI Intelligence** | Post-meeting summaries (OpenAI → HuggingFace → local fallback), action-item extraction |
| F04 | **Real-Time Collab** | In-meeting chat, typing indicators, shared notes via Socket.io |
| F05 | **Post-Meeting Dashboard** | History, transcripts, summaries, CSV export |
| F06 | **Kanban & Teams** | Team workspaces, drag-and-drop boards, live sync |
| F07 | **Notifications** | Real-time alerts for mentions, tasks, and assignments |
| F08 | **Observability** | `/health`, Prometheus `/metrics`, Grafana, Sentry |

---

## Application Screenshots

### 🔑 Authentication & Workspace Setup

| Screen | Preview |
| :--- | :--- |
| **Landing Page**<br>Clean, modern landing page prompting users to join or host meetings. | <a href="screenshots/01_landing_page.png"><img src="screenshots/01_landing_page.png" width="500" alt="Landing Page"></a> |
| **Authentication Flow**<br>Secure login and registration with rate limiting and credential checks. | <a href="screenshots/02_auth_login.png"><img src="screenshots/02_auth_login.png" width="245" alt="Login"></a> <a href="screenshots/02_auth_register.png"><img src="screenshots/02_auth_register.png" width="245" alt="Register"></a> |

### 📊 Dashboard & Analytics

| Screen | Preview |
| :--- | :--- |
| **Intelligent Dashboard**<br>Centrally manage past meetings, active workspaces, and user actions. | <a href="screenshots/03_dashboard.png"><img src="screenshots/03_dashboard.png" width="500" alt="Dashboard"></a> |
| **Productivity Analytics**<br>Comprehensive charts showing meeting duration, activity logs, and trends. | <a href="screenshots/08_productivity_analytics.png"><img src="screenshots/08_productivity_analytics.png" width="500" alt="Productivity Analytics"></a> |
| **User Profile Settings**<br>Update personal details, upload custom avatars, and change password securely. | <a href="screenshots/09_user_profile.png"><img src="screenshots/09_user_profile.png" width="500" alt="User Profile"></a> |

### 🎥 Live Collaboration & AI Insights

| Screen | Preview |
| :--- | :--- |
| **Active Meeting Room**<br>Real-time mesh video, screen sharing, participants list, and collaborative meeting tools. | <a href="screenshots/04_active_meeting_room.png"><img src="screenshots/04_active_meeting_room.png" width="500" alt="Active Meeting Room"></a> |
| **Meeting AI Summary (1/2)**<br>Post-meeting overview highlighting participants and general stats. | <a href="screenshots/05_meeting_ai_summary_1.png"><img src="screenshots/05_meeting_ai_summary_1.png" width="500" alt="Meeting AI Summary 1"></a> |
| **Meeting AI Summary (2/2)**<br>AI-extracted action items, detailed timelines, and transcription details. | <a href="screenshots/05_meeting_ai_summary_2.png"><img src="screenshots/05_meeting_ai_summary_2.png" width="500" alt="Meeting AI Summary 2"></a> |

### 📋 Kanban Boards & Team Management

| Screen | Preview |
| :--- | :--- |
| **Kanban Project Board**<br>Drag-and-drop tasks, statuses, priorities, and assignments for smooth sync. | <a href="screenshots/06_kanban_board.png"><img src="screenshots/06_kanban_board.png" width="500" alt="Kanban Board"></a> |
| **Teams Management (1/2)**<br>Create new teams, manage workspace roles, and define settings. | <a href="screenshots/07_teams_management_1.png"><img src="screenshots/07_teams_management_1.png" width="500" alt="Teams Management 1"></a> |
| **Teams Management (2/2)**<br>Detailed team details, member lists, and active collaborative projects. | <a href="screenshots/07_teams_management_2.png"><img src="screenshots/07_teams_management_2.png" width="500" alt="Teams Management 2"></a> |

---

## Architecture

```
┌─────────────────────┐     HTTPS (REST + WebSocket)
│  React 19 + Vite    │ ─────────────────────────────► ┌──────────────────┐
│  Zustand · Query    │                                │  Nginx Ingress   │
└─────────────────────┘                                └────────┬─────────┘
                                                                │
                       ┌────────────────────────────────────────┼────────────────────┐
                       │                                        ▼                    │
                       │  ┌─────────────────────────────────────────────────────┐    │
                       │  │         Express API + Socket.io + WebRTC Signal    │    │
                       │  └───────┬─────────────┬──────────────┬───────────────┘    │
                       │          │             │              │                     │
                       │          ▼             ▼              ▼                     │
                       │     MongoDB        Redis/Bull     Cloudinary                │
                       └─────────────────────────────────────────────────────────────┘
                                         Prometheus · Grafana · Sentry
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Zustand, TanStack Query |
| **Backend** | Node.js 18, Express (ESM), Socket.io, Bull, Mongoose |
| **Data** | MongoDB, Redis |
| **Real-Time** | WebRTC (STUN), Socket.io |
| **AI** | OpenAI GPT-4o-mini, HuggingFace BART, browser Speech API (transcription) |
| **DevOps** | Docker, Docker Compose, Kubernetes, Helm, GitHub Actions, Vercel, Hugging Face |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB and Redis (or use Docker Compose for everything)

### Option A — Docker Compose (recommended)

```bash
git clone https://github.com/mariammgamall/zidio-webdevelopment-internship.git
cd zidio-webdevelopment-internship
docker compose up --build
```

| Service | URL |
| :--- | :--- |
| Frontend | http://localhost:5173 |
| API | http://localhost:5000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

### Option B — Manual setup

```bash
# Backend
cd server && npm install && cp ../.env.example .env && npm run dev

# Frontend (new terminal)
cd client && npm install && npm run dev
```

Copy [`.env.example`](.env.example) and configure `MONGO_URI`, `REDIS_HOST`, and optional AI keys. The app runs with mock AI fallbacks when keys are empty.

---

## Deployment (Vercel & Hugging Face)

Follow these steps to deploy the application on **Vercel** (frontend client) and **Hugging Face Spaces** (backend API).

### 1. Push code to GitHub

```bash
git add .
git commit -m "feat: IntellMeet v2.0 submission"
git remote add origin https://github.com/mariammgamall/zidio-webdevelopment-internship.git
git push -u origin main
```

### 2. Backend Deployment (Hugging Face Spaces)

The backend is built as a Docker container, making it ideal for deployment on Hugging Face Spaces using the Docker SDK:

1. Create a Hugging Face account and go to [Hugging Face Spaces](https://huggingface.co/spaces).
2. Click **Create new Space**, select **Docker** as the SDK, and choose the **Blank** template.
3. Push the files inside the `server` directory to the Space's Git repository.
   *Note: The `Dockerfile` in the `server` directory must be in the root of the Space repository to build successfully.*
4. In the Hugging Face Space settings, add the following environment variables:
   - `MONGO_URI` (your MongoDB Database Connection String)
   - `JWT_SECRET` (secure random string)
   - `REFRESH_SECRET` (secure random string)
   - `CLIENT_ORIGIN` = `https://mariam-intellmeet.vercel.app`
   - `HF_SUMMARY_MODEL` = `facebook/bart-large-cnn` (optional)
   - `HF_TOKEN` (optional Hugging Face API token)

### 3. Frontend Deployment (Vercel)

The frontend client is a static Vite application deployed to Vercel:

1. Configure rewrite rules: Ensure [`client/vercel.json`](file:///d:/Projects/Internships/ZidioDevelopment/Project%201/client/vercel.json) points to your deployed Hugging Face Space URL. Currently, it is set to:
   `https://mariammgamall-intellmeet-api.hf.space`
2. Sign up or log in to [Vercel](https://vercel.com).
3. Click **Add New** → **Project** and import the GitHub repository.
4. Set the project root directory to `Project 1/client`.
5. Configure the Build and Development settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click **Deploy**.

### 4. Verify URLs

| Service | URL |
| :--- | :--- |
| **Demo (evaluators)** | https://mariam-intellmeet.vercel.app/ |
| **API Health** | https://mariammgamall-intellmeet-api.hf.space/health |

### 5. Test the Demo

1. Visit [https://mariam-intellmeet.vercel.app/](https://mariam-intellmeet.vercel.app/) (refresh once if the free-tier backend is cold-starting).
2. Click **Try Live Demo**.
3. Create a meeting, join from a second browser/incognito tab to test.
4. End the meeting and verify the AI summary appears on the dashboard.

### Free Tier Notes & Troubleshooting

- **Cold Starts**: Hugging Face Spaces sleep after a period of inactivity. The first request can take 1–2 minutes to spin up the container.
- **WebSocket Connection**: Socket.io connections are proxied to the Hugging Face Space. If websockets are restricted in the evaluator's network environment, the client will fall back to HTTP long-polling.
- **CORS Error on Login**: Ensure that `CLIENT_ORIGIN` in the Hugging Face Space settings matches the Vercel URL exactly (`https://mariam-intellmeet.vercel.app`).

---

## Kubernetes / Helm

```bash
kubectl apply -f k8s/intellmeet-k8s.yaml
# or
helm install intellmeet ./helm/intellmeet
```

---

## API Reference

| Route | Method | Description | Auth |
| :--- | :---: | :--- | :---: |
| `/api/auth/register` | POST | Register user | — |
| `/api/auth/login` | POST | Login + tokens | — |
| `/api/auth/refresh` | POST | Refresh JWT | Cookie |
| `/api/auth/profile` | GET | Current user profile | ✓ |
| `/api/meetings` | POST | Create meeting | ✓ |
| `/api/meetings/:id` | GET | Meeting details | ✓ |
| `/api/tasks` | POST | Create task | ✓ |
| `/api/tasks/board` | GET | Kanban board data | ✓ |
| `/api/analytics` | GET | Team analytics | ✓ |
| `/api/notifications` | GET | User notifications | ✓ |
| `/health` | GET | Service health | — |
| `/metrics` | GET | Prometheus metrics | — |

---

## Project Structure

```
intellmeet/
├── client/                 # React 19 + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Landing, Auth, Meeting, Kanban, Analytics
│   │   ├── store/          # Zustand stores
│   │   └── lib/            # API, Socket.io, WebRTC
├── server/                 # Express API
│   └── src/
│       ├── controllers/    # Route handlers
│       ├── models/         # Mongoose schemas
│       ├── socket/         # Real-time events
│       └── jobs/           # Bull AI queue, cron cleanup
├── k8s/                    # Kubernetes manifests
├── helm/                   # Helm chart
├── .github/workflows/      # CI pipeline
└── docker-compose.yml
```

---

## Security

- **Helmet** security headers, **CORS** allowlist, **express-validator** input validation
- **JWT** access tokens (15 min) + **HttpOnly** refresh cookies (7 days)
- **bcrypt** password hashing (10 salt rounds)
- **Rate limiting** on authentication routes (20 requests / 15 min)
- Secrets via environment variables — never committed to the repository

---

## 28-Day Development Timeline

| Week | Focus |
| :--- | :--- |
| **Week 1** | Backend foundation, auth, meetings, Socket.io, Redis |
| **Week 2** | React frontend, video rooms, chat, screen share |
| **Week 3** | AI summaries, Kanban, tasks, notifications |
| **Week 4** | Docker, K8s, Helm, CI/CD, monitoring, production polish |

---

## CI/CD

GitHub Actions runs on every push/PR to `main` and `dev`:

- **Backend:** dependency install + syntax validation
- **Frontend:** TypeScript compile + Vite production build

---

## Known Limitations & Roadmap

| Area | Current State | Planned |
| :--- | :--- | :--- |
| Transcription | Browser Speech API + server storage | Server-side Whisper |
| Meeting CRUD | Create, read, end (no update/delete) | Full REST CRUD |
| Tests | CI build only | Vitest + Playwright E2E |
| Socket auth | Client-provided userId | JWT middleware on connect |
| Load testing | Manual | JMeter benchmark suite |
---


**Zidio Development · LogicVeda · Web Development Domain · March 2026 Edition**
