
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Profile

async def get_username_with_id(
    db: AsyncSession,
    user_id: str,
) -> Optional[str]:
    profile = await db.get(Profile, user_id)
    return profile.username if profile else None