from __future__ import annotations

import sqlite3
from pathlib import Path

from sqlalchemy import select, func

from app.core.config import DB_PATH, SOURCE_DB_PATH
from app.db.session import AsyncSessionLocal, engine
from app.models import Phone
from app.db.base import Base
from app.services.product_intelligence import (
    ensure_product_feature_columns_sync,
    ensure_sqlite_product_feature_columns,
)


async def init_database() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(ensure_product_feature_columns_sync)

    await seed_phones_from_sqlite_if_needed()


async def seed_phones_from_sqlite_if_needed() -> None:
    if not SOURCE_DB_PATH.exists():
        return
    ensure_sqlite_product_feature_columns(SOURCE_DB_PATH)

    async with AsyncSessionLocal() as session:
        existing_count = await session.scalar(select(func.count(Phone.id)))
        if existing_count and existing_count > 0:
            return

        phones = load_phones_from_sqlite(SOURCE_DB_PATH)
        if not phones:
            return

        session.add_all(
            [
                Phone(
                    name=phone.get('name') or 'Unknown product',
                    brand=phone.get('brand') or 'Unknown',
                    price=phone.get('price'),
                    rating=phone.get('rating'),
                    description=phone.get('description'),
                    image_url=phone.get('image_url'),
                    specs=phone.get('specs'),
                    reviews=phone.get('reviews'),
                    stock=phone.get('stock') or 10,
                    min_stock=phone.get('min_stock') or 10,
                    ram=phone.get('ram'),
                    rom=phone.get('rom'),
                    battery=phone.get('battery'),
                    review_count=phone.get('review_count') or 0,
                    category=phone.get('category'),
                    feature_performance_score=phone.get('feature_performance_score'),
                    feature_gaming_score=phone.get('feature_gaming_score'),
                    feature_camera_score=phone.get('feature_camera_score'),
                    feature_battery_score=phone.get('feature_battery_score'),
                    feature_display_score=phone.get('feature_display_score'),
                    feature_premium_score=phone.get('feature_premium_score'),
                    feature_confidence=phone.get('feature_confidence'),
                    feature_source=phone.get('feature_source'),
                    feature_reason=phone.get('feature_reason'),
                    feature_signature=phone.get('feature_signature'),
                    feature_updated_at=phone.get('feature_updated_at'),
                )
                for phone in phones
            ]
        )
        await session.commit()


def load_phones_from_sqlite(db_path: Path) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(
            """
            SELECT
                name,
                brand,
                price,
                rating,
                description,
                image_url,
                specs,
                reviews,
                stock,
                min_stock,
                ram,
                rom,
                battery,
                review_count,
                category,
                feature_performance_score,
                feature_gaming_score,
                feature_camera_score,
                feature_battery_score,
                feature_display_score,
                feature_premium_score,
                feature_confidence,
                feature_source,
                feature_reason,
                feature_signature,
                feature_updated_at
            FROM phones
            """
        ).fetchall()
        return [dict(row) for row in rows]
    except sqlite3.OperationalError:
        return []
    finally:
        conn.close()
