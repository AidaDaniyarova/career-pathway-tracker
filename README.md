# Career Pathway Tracker

A career development platform for graduates moving into tech: take a career quiz, follow career paths made of learning modules, track progress and XP, build and analyse a CV, and get AI-assisted career recommendations.

## Live demo

**Live app:** https://career-pathway-tracker-gold.vercel.app

**Demo login:** `john@example.com` / `password123`

> The backend runs on Render's free tier and sleeps after ~15 minutes without traffic. The first request after that can take about a minute while it wakes up; after that it is fast.

### What to try

1. Register a new account, or sign in with the demo account.
2. Accept the AI consent dialog. AI features stay off until you do.
3. Take the career quiz and look at the recommended paths.
4. Browse career paths, enrol in one, and work through its learning modules.
5. Build a CV in the CV builder, export it, and run the CV analysis against a job description.
6. Open AI recommendations to see paths ranked by your quiz results, skills, CV and learning progress.

### Architecture

React + TypeScript (Vercel) → Django REST API in Docker (Render) → Neon Postgres. GitHub Actions CI gates every deploy.

## Features

- **Accounts:** JWT authentication (register, login, logout, token refresh) and a user profile with an avatar.
- **Career quiz:** a weighted multiple-choice quiz that scores every career path against the best possible answers.
- **Career paths and modules:** paths with required skills, ordered learning modules, enrolment and progress tracking with XP.
- **Skills:** track your skills with a proficiency level from 1 to 5.
- **CV builder:** create, edit, duplicate and set a default CV; export to PDF or Word.
- **CV analysis:** score a CV against a job description (skills, wording, soft skills and years of experience; parts the job doesn't mention are left out) and list matched and missing skills.
- **AI features:** career recommendations (a weighted average of the quiz, your skills and your CV, with a bonus for progress on enrolled paths), skill-gap analysis, interview question generation, job description summaries and a career-advice chat. Job description summaries use Hugging Face Inference Providers when `HF_TOKEN` is set; everything else, and the summaries when the API is unavailable, uses built-in logic.
- **Admin dashboard:** manage users, career paths, modules and quizzes.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Axios |
| Backend | Django 6, Django REST Framework, SimpleJWT, Gunicorn, WhiteNoise |
| Database | PostgreSQL (Neon) |
| AI | Hugging Face Inference Providers (optional; built-in fallback) |
| Hosting | Vercel (frontend), Render free web service from `backend/Dockerfile` (API) |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`, `deploy.yml`), Dependabot |

## Local setup

### Prerequisites

- Python 3.13
- Node.js 22
- A PostgreSQL database. A free [Neon](https://neon.tech) project works; use a development branch, not production.

### 1. Backend

```bash
git clone https://github.com/AidaDaniyarova/career-pathway-tracker.git
cd career-pathway-tracker/backend

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` from the example and fill it in:

```bash
cp env_example .env
```

- `SECRET_KEY`: generate one with `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- `DEBUG=True`: only on your own machine.
- `DATABASE_URL`: your Neon connection string (`postgresql://...?sslmode=require`).
- `HF_TOKEN`: optional. A Hugging Face fine-grained token with the "Make calls to Inference Providers" permission. Without it, the AI features use their fallback.

Never commit `.env`.

Create the tables and load the demo data:

```bash
cd tracker
python manage.py migrate
python populate_db.py      # demo user + career paths, modules, skills, quiz; safe to re-run
python manage.py runserver
```

The API runs at http://127.0.0.1:8000/.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

The app runs at http://localhost:3000/. The Vite dev server forwards `/api` to the backend on port 8000, so no frontend `.env` is needed locally. `VITE_API_URL` (see `frontend/.env.example`) is only needed when the API is on a different origin, as it is in production.

## Tests and checks

Backend tests use an in-memory SQLite database (`tracker/test_settings.py`), so they don't touch your real database:

```bash
cd backend/tracker
python manage.py test test --settings=tracker.test_settings
```

Frontend type-check, lint and production build:

```bash
cd frontend
npx tsc -b
npm run lint
npm run build
```

CI runs all of these on every push and pull request, along with `manage.py check --deploy`, a missing-migrations check, `pip-audit`, `npm audit` and Docker image builds.

## Deployment

- **Backend (Render):** `render.yaml` defines a free Docker web service built from `backend/Dockerfile`. Render deploys only after the commit's GitHub checks pass. On start, `backend/start.sh` runs migrations, then Gunicorn.
- **Frontend (Vercel):** `.github/workflows/deploy.yml` deploys to Vercel after CI succeeds on `main`. Vercel's automatic Git deploys of `main` are off, so the site can't go live ahead of CI.
- **Database:** Neon Postgres. Render uses the pooled connection string for the app and the direct one for migrations.

## API overview

All endpoints are under `/api/`. Most need a JWT `Authorization: Bearer <token>` header. Register, login, token refresh, the health check and browsing career paths, modules and quizzes are public; changes to career paths and modules need an admin.

| Area | Endpoints |
|---|---|
| Auth and profile | `users/register/`, `users/login/`, `users/logout/`, `users/token/refresh/`, `users/profile/`, `users/ai-consent/` |
| Career paths and modules | `learning/career-paths/`, `learning/career-paths/{id}/`, `learning/modules/` |
| Progress | `progress/enrollments/`, `progress/progress/`, `progress/dashboard/`, `progress/analytics/` |
| Skills | `skills/skills/`, `skills/user-skills/` |
| Quiz | `quizzes/quizzes/`, `quizzes/start/`, `quizzes/submit/` |
| CV | `cv/cvs/`, `cv/cvs/{id}/duplicate/`, `cv/cvs/{id}/export-pdf/`, `cv/cvs/{id}/export-word/`, `cv/templates/` |
| AI | `ai/recommendations/`, `ai/job-match/`, `ai/job-scans/`, `ai/interview-questions/`, `ai/summarize-job/`, `ai/chat/`, `ai/skill-gap/{career_path_id}/` |
| Health | `health/` |

## Project structure

```
career-pathway-tracker/
├── backend/
│   ├── Dockerfile, start.sh       # production image (Render)
│   ├── requirements.txt
│   ├── env_example                # copy to backend/.env
│   └── tracker/
│       ├── manage.py
│       ├── populate_db.py         # idempotent demo/reference data
│       ├── test.py                # backend test suite
│       ├── tracker/               # settings, urls, health check
│       ├── users/ skills/ learning/ progress/ quizzes/ cv/ ai/
│       └── admin_dashboard/ api/ course_scraper/
├── frontend/                      # React + TypeScript (Vite), vercel.json
├── .github/workflows/             # ci.yml, deploy.yml
├── render.yaml                    # Render blueprint
└── docker-compose.yml             # optional self-hosted stack
```

## Troubleshooting

- **The live app hangs on the first request:** the Render backend is waking up. Wait about a minute and retry.
- **`Hugging Face rejected HF_TOKEN` in the logs:** the token is missing the Inference Providers permission, or it was revoked or expired. Create a new fine-grained token and update `HF_TOKEN`. The app keeps working on its fallback in the meantime.
- **`Hugging Face Inference Providers credits are used up (HTTP 402)` in the logs:** the Hugging Face account has no credits (free accounts have no included usage). The app keeps working on its fallback. Add pre-paid credits, or remove `HF_TOKEN` to silence the message.
- **`Hugging Face API is not reachable` in the logs:** a network error or timeout. The app uses the fallback for 5 minutes, then tries again.
- **Database connection errors:** check `DATABASE_URL` in `backend/.env` and that it ends with `?sslmode=require`.
