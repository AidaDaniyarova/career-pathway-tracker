# tracker/test_settings.py
from .settings import *

# Force SQLite for testing - OVERRIDE the database setting
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',  # In-memory database - fresh for each test
    }
}

# Disable migrations for faster tests
MIGRATION_MODULES = {
    app: None for app in INSTALLED_APPS
    if app not in ['django.contrib.contenttypes', 'django.contrib.auth']
}

# Faster password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable password validators for tests
AUTH_PASSWORD_VALIDATORS = []

# Ensure testserver is allowed
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

# Increase throttle rates for tests
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '10000/day',
    'user': '100000/day',
    'login': '10000/day',
    'register': '10000/day',
    'ai': '10000/day',
}

# Disable CSRF for tests
MIDDLEWARE = [m for m in MIDDLEWARE if 'csrf' not in m.lower()]

# Use local memory cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Mock external services
HUGGINGFACE_API_KEY = 'test_key'
APIFY_API_TOKEN = 'test_token'