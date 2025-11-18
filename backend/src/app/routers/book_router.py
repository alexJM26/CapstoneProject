from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.openlibrary.openlibrary import openlibrary_search
from app.services.books.book_filter import filter_books
from app.services.books.book_ratings import add_ratings_to_results
from app.schemas.requests import SearchBookRequest
from app.db import get_db
from app.auth import get_current_user
from app.core.logging import logger

router = APIRouter(prefix="/book_router", tags=["openlibrary"])

# Search books by title
@router.post("/search")
async def search_book(
    req: SearchBookRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        q     = req.search or ""
        limit = req.limit
        page  = req.page

        # Get external book information from OpenLibrary API
        data = await openlibrary_search(q, limit=limit, page=page)

        # Add Book Review Ratings to each book
        data = await add_ratings_to_results(db, data)

        # Filter books
        if req.minRating or req.maxRating or req.pubDateStart or req.pubDateEnd:
            parsed = await filter_books(db, data, req)
        else:
            parsed = data

        return parsed
    except Exception as e:
        logger.error(f"book_router [search_book] - Failed. Error: {e}")
        raise HTTPException(status_code=500, detail="Error searching for books")
    