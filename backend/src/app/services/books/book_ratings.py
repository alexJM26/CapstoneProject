from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from app.services.database.book_service import get_book_by_data
from app.services.database.reviews import get_book_rating

# Helper function to add ratings to search results
async def add_ratings_to_results(
    db: AsyncSession, 
    data: Dict[str, Any]
) -> Dict[str, Any]:

    results: List[Dict[str, Any]] = data.get("results", [])

    # Helper function that returns a rating given book data
    async def _get_rating(book: Dict[str, Any]) -> Tuple[Optional[float], int]:
        authors = book.get("authors")
        author_name = authors[0] if isinstance(authors, list) and authors else book.get("author_name")

        book_id = await get_book_by_data(db, {
            "title": book.get("title"),
            "isbn": book.get("isbn"),
            "author_name": author_name,
        })
        if not book_id:
            return (None, 0)

        avg, count, _ = await get_book_rating(db, book_id)
        return (
            float(avg) if avg is not None else None,
            int(count) if count is not None else 0,
        )
    
    for book in results:
        rating, count = await _get_rating(book)
        book["book_rating"] = rating
        book["book_rating_count"] = count

    return data