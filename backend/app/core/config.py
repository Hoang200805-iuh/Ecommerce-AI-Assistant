import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]

# Load backend/.env explicitly so config works whether the app is started from
# repo root, backend/, Docker, or the serverless api/ entrypoint.
load_dotenv(BASE_DIR / '.env')


def _get_env(*keys: str, default: str = '') -> str:
    for key in keys:
        value = os.getenv(key)
        if value is not None and value.strip() != '':
            return value.strip()
    return default


def _env_bool(key: str, default: bool = False) -> bool:
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


SOURCE_DB_PATH = BASE_DIR / 'prisma' / 'phones.db'


def resolve_db_path() -> Path:
    # Vercel filesystem is read-only except /tmp.
    if os.getenv('VERCEL') == '1':
        runtime_db = Path('/tmp/phones.db')
        if not runtime_db.exists() and SOURCE_DB_PATH.exists():
            shutil.copy2(SOURCE_DB_PATH, runtime_db)
        return runtime_db
    return SOURCE_DB_PATH


DB_PATH = resolve_db_path()
# Prefer explicit DATABASE_URL (e.g. Postgres) from environment, fallback to sqlite file for local/dev
DATABASE_URL = os.getenv('DATABASE_URL') or f'sqlite+aiosqlite:///{DB_PATH.as_posix()}'

ALLOWED_ORIGINS = ['*']
ALLOWED_METHODS = ['*']
ALLOWED_HEADERS = ['*']

OTP_EMAIL_SMTP_HOST = _get_env('OTP_EMAIL_SMTP_HOST', 'SMTP_HOST', default='smtp.gmail.com')
OTP_EMAIL_PORT = int(_get_env('OTP_EMAIL_PORT', 'SMTP_PORT', default='587'))
OTP_EMAIL_USERNAME = _get_env('OTP_EMAIL_USERNAME', 'SMTP_USERNAME', 'SMTP_USER', 'GMAIL_USERNAME')
OTP_EMAIL_PASSWORD = _get_env('OTP_EMAIL_PASSWORD', 'SMTP_PASSWORD', 'SMTP_PASS', 'GMAIL_APP_PASSWORD')
OTP_EMAIL_FROM = _get_env('OTP_EMAIL_FROM', 'SMTP_FROM', default=OTP_EMAIL_USERNAME)
OTP_EMAIL_EXPIRE_MINUTES = int(os.getenv('OTP_EMAIL_EXPIRE_MINUTES', '5'))
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
FACEBOOK_APP_ID = os.getenv('FACEBOOK_APP_ID', '')
FACEBOOK_APP_SECRET = os.getenv('FACEBOOK_APP_SECRET', '')

# Gemini API config for the AI shopping assistant.
# Supports both the explicit Gemini key name and a generic Google API key for local setup.
GEMINI_API_KEY = _get_env('GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_API_KEY')
GEMINI_MODEL = _get_env('GEMINI_MODEL', 'GOOGLE_GEMINI_MODEL', default='gemini-2.5-flash')
GEMINI_TIMEOUT_SECONDS = float(os.getenv('GEMINI_TIMEOUT_SECONDS', '12'))
GEMINI_MAX_OUTPUT_TOKENS = int(os.getenv('GEMINI_MAX_OUTPUT_TOKENS', '900'))
GEMINI_THINKING_BUDGET = int(os.getenv('GEMINI_THINKING_BUDGET', '0'))

RAG_FEATURE_ENRICHMENT_ENABLED = _env_bool('RAG_FEATURE_ENRICHMENT_ENABLED', default=True)
