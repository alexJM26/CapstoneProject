from math import ceil
from typing import Dict, Any, List, Optional
from app.schemas.search_book import SearchBookRequest


def _parse_year(date_str) -> Optional[int]:
    if not date_str: return None

    s = str(date_str).strip()
    if s.lower() == "undefined" or s.lower() == "null": return None

    # Support if we change it to just year (YYYY)
    if len(s) == 4 and s.isdigit():
        return int(s)
    
    # YYYY-MM-DD format
    if len(s) >= 4 and s[:4].isdigit():
        return int(s[:4])
    
    return None
    
def filter_books(books, request: SearchBookRequest):
    results: List[Dict[str, Any]] = books.get("results", []) or []


    start_year = _parse_year(request.pubDateStart)
    end_year = _parse_year(request.pubDateEnd)

    # Helper function to parse book against filter
    def _keep_book(book: Dict[str, Any]) -> bool:
        # Publish year
        year = book.get("first_publish_year")
        if start_year is not None:
            if year is None or year < start_year:
                return False
        if end_year is not None:
            if year is None or year > end_year:
                return False
        
        # Add Ratings filter here

        return True

    filtered = [b for b in results if _keep_book(b)]
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