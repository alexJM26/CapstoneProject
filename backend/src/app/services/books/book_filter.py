from math import ceil
from typing import Dict, Any, List, Optional
from app.schemas.search_book import SearchBookRequest
from app.services.database.reviews import get_book_rating
from app.services.database.book_service import get_book_by_data
from sqlalchemy.ext.asyncio import AsyncSession


def _parse_year(date_str) -> Optional[int]:
    if not date_str: return None

    s = str(date_str).strip()
    if s.lower() == "undefined" or s.lower() == "null": return None

    # Support if we change it to just year (YYYY) because all the publishd dates are just their years
    if len(s) == 4 and s.isdigit():
        return int(s)
    
    # YYYY-MM-DD format
    if len(s) >= 4 and s[:4].isdigit():
        return int(s[:4])
    
    return None

async def filter_books(db: AsyncSession, books, request: SearchBookRequest):
    results: List[Dict[str, Any]] = books.get("results", []) or []

    start_year = _parse_year(request.pubDateStart)
    end_year = _parse_year(request.pubDateEnd)
    minRating = request.minRating
    maxRating = request.maxRating

    # Helper function to parse book against filter
    async def _keep_book(book: Dict[str, Any]) -> bool:

        # Filter by publish year
        year = book.get("first_publish_year")
        if start_year is not None:
            if year is None or year < start_year:
                return False
        if end_year is not None:
            if year is None or year > end_year:
                return False
        
        # Filter by rating
        if minRating or maxRating:
            book_rating = book.get("book_rating")
            if not book_rating:
                return False
            
            if minRating and minRating > book_rating: return False
            if maxRating and maxRating < book_rating: return False

        return True

    filtered = [b for b in results if await _keep_book(b)]
    total_filtered = len(filtered)

    limit = int(request.limit or 10)
    page = int(request.page or 1)
    start = (page - 1) * limit
    end = start + limit
    page_results = filtered[start:end]
    pages = ceil(total_filtered / limit) if limit else 1

    return {
        "total": total_filtered,
        "page": page,
        "limit": limit,
        "pages": pages,
        "results": page_results,
    }