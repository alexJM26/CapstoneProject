import logging

from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Collections
from datetime import datetime, timezone


logger = logging.getLogger(__name__)


async def get_collection_id_by_name(
    db:AsyncSession,
    user_id: str,
    name:str,
) -> Optional[str]:
    if not name or not user_id:
        return None
    result = await db.execute(
        select(Collections.collection_id).where(
            Collections.user_id == user_id,
            func.lower(Collections.name) == name.lower()
        )
    )
    coll_id = result.scalar_one_or_none()
    return str(coll_id) if coll_id is not None else None

async def create_user_collection(
    db: AsyncSession,
    user_id: str,
    collection_name: str,
    icon_id: int,
) -> Optional[str]:

    # Check name
    name = (collection_name or "").strip()
    if not name or not user_id or not isinstance(icon_id, int) or icon_id <= 0:
        return None

    # Check for user duplicates
    result = await db.execute(
        select(Collections.collection_id).where(
            Collections.user_id == user_id,
            func.lower(Collections.name) == name.lower()
        )
    )
    existing_id = result.scalar_one_or_none()
    if existing_id:
        return None


    new_coll = Collections(
        user_id=user_id,
        name=name,
        icon_id=icon_id,
        created_at = datetime.now(timezone.utc)
    )
    db.add(new_coll)
    await db.flush()
    coll_id = getattr(new_coll, "collection_id", None)
    return str(coll_id) if coll_id is not None else None


async def get_user_collections(db : AsyncSession, user_id: str) -> Optional[str]:
    if not user_id:
        return []
    
    result = await db.execute(
        select(Collections).where(Collections.user_id == user_id).order_by(Collections.created_at.desc())
    )
    return result.scalars().all()

