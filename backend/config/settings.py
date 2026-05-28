from __future__ import annotations

import os
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
LIB_DIR = REPO_ROOT / "lib"

if str(LIB_DIR) not in sys.path:
    sys.path.insert(0, str(LIB_DIR))


def load_backend_env() -> None:
    """Load root `.env.backend` values without overriding real shell environment values."""
    env_path = REPO_ROOT / ".env.backend"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


load_backend_env()

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "imaginai-dev-secret-change-me")
DEBUG = os.environ.get("DJANGO_DEBUG", "1").lower() in {"1", "true", "yes", "on"}
ALLOWED_HOSTS = (os.environ.get("DJANGO_ALLOWED_HOSTS") or os.environ.get("ALLOWED_HOSTS") or "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "common",
    "accounts",
    "ai_providers",
    "scenarios",
    "adventures",
    "story_engine",
    "imports",
    "admin_tools",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "common.middleware.ApiCsrfMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
ASGI_APPLICATION = "config.asgi.application"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

DB_ENGINE = os.environ.get("DJANGO_DB_ENGINE") or ("django.db.backends.postgresql" if os.environ.get("DB_HOST") else "django.db.backends.sqlite3")
DATABASES = {
    "default": {
        "ENGINE": DB_ENGINE,
        "NAME": os.environ.get("DJANGO_DB_NAME") or os.environ.get("DB_NAME") or str(BASE_DIR / "db.sqlite3"),
    }
}
if "postgresql" in DB_ENGINE:
    DATABASES["default"].update(
        {
            "USER": os.environ.get("DJANGO_DB_USER") or os.environ.get("DB_USER") or "imaginai",
            "PASSWORD": os.environ.get("DJANGO_DB_PASSWORD") or os.environ.get("DB_PASSWORD") or "",
            "HOST": os.environ.get("DJANGO_DB_HOST") or os.environ.get("DB_HOST") or "127.0.0.1",
            "PORT": os.environ.get("DJANGO_DB_PORT") or os.environ.get("DB_PORT") or "5432",
            "CONN_MAX_AGE": int(os.environ.get("DJANGO_DB_CONN_MAX_AGE") or os.environ.get("DB_CONN_MAX_AGE") or "60"),
        }
    )

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"
FRONTEND_ORIGINS = os.environ.get("CSRF_TRUSTED_ORIGINS") or os.environ.get("CORS_ALLOWED_ORIGINS") or "http://localhost:5173,http://127.0.0.1:5173"
CSRF_TRUSTED_ORIGINS = [origin for origin in FRONTEND_ORIGINS.split(",") if origin]

REDIS_URL = os.environ.get("REDIS_URL") or (
    f"redis://{os.environ.get('REDIS_HOST', '127.0.0.1')}:{os.environ.get('REDIS_PORT', '6379')}/{os.environ.get('REDIS_DB', '1')}"
    if os.environ.get("REDIS_HOST") or os.environ.get("REDIS_URL")
    else ""
)
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
} if REDIS_URL else {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

IMAGINAI_ENV_CREDENTIALS = {
    "openai": os.environ.get("OPENAI_API_KEY"),
    "anthropic": os.environ.get("ANTHROPIC_API_KEY"),
    "gemini": os.environ.get("GEMINI_API_KEY"),
    "openrouter": os.environ.get("OPENROUTER_API_KEY"),
}
IMAGINAI_ROTATOR_DATA_DIR = os.environ.get("IMAGINAI_ROTATOR_DATA_DIR", str(BASE_DIR / ".rotator"))
IMAGINAI_FAKE_LLM = os.environ.get("IMAGINAI_FAKE_LLM", "0") == "1"
