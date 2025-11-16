import logging

from typing import List, Optional, Sequence, Dict, Any
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Collections, Profile
from datetime import datetime, date, timezone, timedelta


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

async def get_collection_books(
    db: AsyncSession,
    collection_id: int,
) -> List[Dict]:
    # Check that the collection exists
    exists = await db.execute(
        text("SELECT 1 FROM collections WHERE collection_id = :cid"),
        {"cid": collection_id},
    )
    if exists.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Retrieve books joined with book details
    result = await db.execute(
        text(
            """
            SELECT
                b.book_id,
                b.title,
                a.name AS author_name,
                b.year_published,
                b.isbn,
                b.cover_img_url,
                cb.position
            FROM collection_books cb
            JOIN books b ON cb.book_id = b.book_id
            LEFT JOIN authors a ON b.author_id = a.author_id
            WHERE cb.collection_id = :cid
            ORDER BY cb.position NULLS LAST, b.title
            """
        ),
        {"cid": collection_id},
    )

    rows = result.mappings().all()
    return [dict(r) for r in rows]

async def search_collections_by_title(
    db: AsyncSession,
    search: str,
    pubDateStart: Optional[str] = None,
    pubDateEnd: Optional[str] = None,
) -> Sequence[Collections]:

    start_date: Optional[date] = None
    end_date: Optional[date] = None

    statement = (
        select(Collections)
        .where(Collections.name.ilike(f"%{search}%"))
    )

    if pubDateStart:
        start_date = date.fromisoformat(pubDateStart)
        statement = statement.where(func.date(Collections.created_at) >= start_date)
        
    if pubDateEnd:
        end_date = date.fromisoformat(pubDateEnd)
        statement = statement.where(func.date(Collections.created_at) <= end_date)

    result = await db.execute(statement)

    return result.scalars().all()

# Searches collections by user. This is not an exact match like get_user_collections.
async def search_collections_by_user(
    db: AsyncSession,
    search: str,
    pubDateStart: Optional[str] = None,
    pubDateEnd: Optional[str] = None,
) -> Sequence[Collections]:
    statement = (
        select(Collections)
        .join(Profile, Collections.user_id == Profile.user_id)
        .where(Profile.username.ilike(f"%{search}%"))
        .order_by(Collections.created_at.desc())
    )

    if pubDateStart:
        start_date = date.fromisoformat(pubDateStart)
        statement = statement.where(func.date(Collections.created_at) >= start_date)
        
    if pubDateEnd:
        end_date = date.fromisoformat(pubDateEnd)
        statement = statement.where(func.date(Collections.created_at) <= end_date)

    result = await db.execute(statement)
    return result.scalars().all()

async def build_collection_search_response(
    db: AsyncSession,
    collections: Sequence[Collections],
) -> Dict[str, Any]:
    """
    Given a list of Collections objects it will build the following schema

    {
      "results": [
        {
          "iconId": ...,
          "title": ...,
          "username": ...,
          "created_at": ...,
          "books": [
            {"title": ..., "cover": ...},
            ...
          ]
        },
        ...
      ]
    }
    """
    results: list[dict] = []

    for collection in collections:
        # Get the username
        username_result = await db.execute(
            select(Profile.username).where(Profile.user_id == collection.user_id)
        )
        username = username_result.scalar_one_or_none() or "Unknown"

        # This gets the books for the collection
        book_rows = await get_collection_books(db, collection.collection_id)

        books = [
            {
                "title": row["title"],
                "cover": row["cover_img_url"] or "../images/bookCoverDefault.svg", # default 
            }
            for row in book_rows
        ]

        results.append(
            {
                "iconId": collection.icon_id or 1,
                "title": collection.name,
                "username": username,
                "created_at": (
                    collection.created_at.isoformat()
                    if collection.created_at
                    else None
                ),
                "books": books,
            }
        )

    return {"results": results}