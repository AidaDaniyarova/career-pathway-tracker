FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# libpq for psycopg2; nothing else is needed at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Run as an unprivileged user
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/static /app/media \
    && chown -R appuser:appuser /app
USER appuser

# manage.py lives in backend/tracker/
WORKDIR /app/tracker

# Build-time only key so collectstatic can import settings; the real key comes from the environment
RUN SECRET_KEY=build-only-not-secret DEBUG=False python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "tracker.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "2", "--access-logfile", "-"]
