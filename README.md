# Career Pathway Tracker

A comprehensive career development platform that helps users track their learning progress, build CVs, practice interviews, and get AI-powered career recommendations.

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Backend API Documentation](#backend-api-documentation)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## Features

- User Authentication: JWT-based authentication with registration and login
- Career Paths: Curated learning paths for different careers
- Skill Management: Track and manage user skills with proficiency levels
- Progress Tracking: Monitor learning progress with XP and levels
- CV Builder: Create, edit, and export professional CVs
- AI Recommendations: Get personalized career recommendations
- Job Scanner: Analyze CV against job descriptions
- Interview Practice: Generate and practice interview questions
- Quiz System: Career assessment quizzes
- Admin Dashboard: Comprehensive admin interface

## Technology Stack

### Backend
- Django 5.2.1 - Web framework
- Django REST Framework - API development
- PostgreSQL - Production database
- SQLite - Development/Testing database
- JWT - Authentication

### AI & External Services
- Hugging Face API - AI models for recommendations
- Apify - Web scraping for courses

### Testing
- Django Test Framework - Unit and integration tests

## Prerequisites

### Required Software
- Python 3.10 or higher
- PostgreSQL 13+ (production)
- Git

### Python Packages
All dependencies are listed in `requirements.txt`

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/AidaDaniyarova/career-pathway-tracker.git
cd career-pathway-tracker/backend
```

### 2. Create Virtual Environment

Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

Linux/Mac:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
python.exe -m pip install -r requirements.txt
```

### 4. Environment Configuration

Create a `.env` file in the `backend/tracker/` directory:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL for production)
DB_NAME=career_tracker
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# AI Services (Optional - app works with fallbacks)
HUGGINGFACE_API_KEY=your_huggingface_key
```

### 5. Database Setup

For Development (SQLite - No setup needed):
```bash
cd backend/tracker
python manage.py makemigrations
python manage.py migrate
```

For Production (PostgreSQL):
```bash
# Create PostgreSQL database
createdb career_tracker

# Run migrations
cd backend/tracker
python manage.py makemigrations
python manage.py migrate
```

### 6. Create Superuser (Admin Access)

```bash
python manage.py createsuperuser
```

### 7. Load Initial Data

```bash
python populate_db.py
```

## Running the Application

### Start Development Server
## Backend
```bash
python manage.py runserver
```

The application will be available at: `http://127.0.0.1:8000/`
## Frontend
```bash
cd frontend
npm install
npm run dev
```

The application will be available at: `http://localhost:3000/`

## Running Tests

### Test Configuration

The project uses SQLite in-memory database for testing. Test settings are in `tracker/test_settings.py`.

### Run All Tests

```bash
cd backend/tracker
python manage.py test --settings=tracker.test_settings
```

### Run Specific Test Categories

```bash
# Run with more verbose output
python manage.py test --settings=tracker.test_settings --verbosity=2
```

### Quick Test Commands

```bash
# Run and save report
python manage.py test --settings=tracker.test_settings --verbosity=2 > test_report.txt 2>&1

# Run with output to console and file
python manage.py test --settings=tracker.test_settings --verbosity=2 2>&1 | tee test_report.txt
```

### Test Suite Overview

| Test Category | Number of Tests | Description |
|--------------|----------------|-------------|
| User Authentication | 2 | Registration, login, profile |
| Career Paths | 4 | List, detail, enroll, modules |
| Skills | 4 | CRUD operations for skills |
| Progress Tracking | 3 | Module progress, XP, dashboard |
| CV Builder | 7 | Create, edit, delete, duplicate CVs |
| AI Features | 1 | Career recommendations |
| Job Scanner | 2 | CV analysis, history |
| Interview Practice | 3 | Generate questions, save answers |
| Total | 24 | All tests passing |

### Expected Test Output

```
Found 24 test(s).
Creating test database...
test_get_recommendations ... ok
test_create_cv ... ok
...
----------------------------------------------------------------------
Ran 24 tests in 0.143s

OK
Destroying test database...
```

## Backend API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register/` | User registration |
| POST | `/api/users/login/` | User login |
| GET | `/api/users/profile/` | Get user profile |
| PUT/PATCH | `/api/users/profile/` | Update profile |

### Career Path Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/learning/career-paths/` | List career paths |
| GET | `/api/learning/career-paths/{id}/` | Get career path details |
| POST | `/api/learning/career-paths/{id}/enroll/` | Enroll in career path |
| GET | `/api/learning/career-paths/{id}/modules/` | Get modules |

### CV Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cv/cvs/` | List user's CVs |
| POST | `/api/cv/cvs/` | Create new CV |
| GET | `/api/cv/cvs/{id}/` | Get CV details |
| PUT | `/api/cv/cvs/{id}/` | Update CV |
| DELETE | `/api/cv/cvs/{id}/` | Delete CV |
| POST | `/api/cv/cvs/{id}/duplicate/` | Duplicate CV |
| POST | `/api/cv/cvs/{id}/set-default/` | Set as default |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/recommendations/` | Get career recommendations |
| POST | `/api/ai/job-match/` | Analyze CV against job |
| POST | `/api/ai/interview-questions/` | Generate interview questions |
| POST | `/api/ai/interview-answers/` | Save interview answers |

## Project Structure

```
career-pathway-tracker/
├── backend/
│   ├── tracker/
│   │   ├── settings.py          # Main settings
│   │   ├── test_settings.py     # Test settings (SQLite)
│   │   ├── urls.py              # Main URL config
│   │   ├── wsgi.py
│   │   └── test.py              # Test suite
│   ├── users/                   # User management app
│   ├── skills/                  # Skills management app
│   ├── learning/                # Learning paths app
│   ├── progress/                # Progress tracking app
│   ├── cv/                      # CV builder app
│   ├── ai/                      # AI features app
│   ├── quizzes/                 # Quiz system app
│   ├── api/                     # API views
│   ├── manage.py
│   ├── requirements.txt
│   └── .env                     # Environment variables
├── frontend/                    # React frontend (separate)
├── .gitignore
└── README.md
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Migration Errors

```bash
# Reset migrations
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
python manage.py makemigrations
python manage.py migrate
```

#### 2. Hugging Face API Not Reachable

The app has built-in fallbacks. This warning is normal in development.

```python
# To suppress warnings
import warnings
warnings.filterwarnings('ignore', message='Hugging Face API is not reachable')
```

#### 3. PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Restart PostgreSQL
sudo service postgresql restart  # Linux
brew services restart postgresql # Mac
```
