from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DB_PATH = BASE_DIR / 'prisma' / 'phones.db'
DATABASE_URL = f'sqlite+aiosqlite:///{DB_PATH.as_posix()}'

ALLOWED_ORIGINS = ['*']
ALLOWED_METHODS = ['*']
ALLOWED_HEADERS = ['*']
