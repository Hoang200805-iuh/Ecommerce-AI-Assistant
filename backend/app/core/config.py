import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _get_env(*keys: str, default: str = '') -> str:
    for key in keys:
        value = os.getenv(key)
        if value is not None and value.strip() != '':
            return value.strip()
    return default

BASE_DIR = Path(__file__).resolve().parents[2]
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
