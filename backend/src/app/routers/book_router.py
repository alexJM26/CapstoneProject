from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.openlibrary.openlibrary import openlibrary_search
from app.services.books.book_filter import filter_books
from app.services.books.book_ratings import add_ratings_to_results
from app.schemas.search_book import SearchBookRequest
from app.db import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/book_router", tags=["openlibrary"])

@router.post("/search")
async def search_book(
    req: SearchBookRequest,
    db: AsyncSession = Depends(get_db),
):
    q     = req.search or ""
    limit = req.limit
    page  = req.page

    # Get external book information
    data = await openlibrary_search(q, limit=limit, page=page)

    # Add review ratings and count for each book that has one
    data = await add_ratings_to_results(db, data)

    # Filter books if asked 
    if req.minRating or req.maxRating or req.pubDateStart or req.pubDateEnd:
        parsed = await filter_books(db, data, req)
    else:
        parsed = data

    return parsed