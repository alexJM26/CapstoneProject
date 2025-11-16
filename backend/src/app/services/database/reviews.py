from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Review


async def get_book_reviews(
    db: AsyncSession,
    book_id: int
) -> list[Review]:
    """Return all reviews for the given book, ordered from newest to oldest."""
    result = await db.execute(
        select(Review)
        .where(Review.book_id == book_id)
        .order_by(Review.review_id.desc())
    )

    return result.scalars().all()


async def get_book_rating(
    db: AsyncSession,
    book_id: int,
) -> tuple[Optional[float], int, int]:
    """Return the average rating, review count, and total stars for the given book_id."""
    sqlStatement = select(
        func.count(Review.review_id),
        func.coalesce(func.sum(Review.rating), 0),
        func.avg(Review.rating),
    ).where(Review.book_id == book_id)

    count, sumation, avg = (await db.execute(sqlStatement)).one()
    average = float(avg) if avg is not None else None
    return (average, int(count), int(sumation))