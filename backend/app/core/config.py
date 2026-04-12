import os
import shutil
from pathlib import Path

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
DATABASE_URL = f'sqlite+aiosqlite:///{DB_PATH.as_posix()}'

ALLOWED_ORIGINS = ['*']
ALLOWED_METHODS = ['*']
ALLOWED_HEADERS = ['*']
