from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.openlibrary.openlibrary import openlibrary_search, openlibrary_book_data

router = APIRouter(prefix="/book_router", tags=["openlibrary"])

@router.get("/search")
async def search_book(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
):

    # TODO: Get internal book information first

    # Get external book information
    data = await openlibrary_search(q, limit=limit, page=page)

    # Format book information

    return data


# Gets the book data for a specific book
@router.get("/get_book_data")
async def get_book_data(
    book_id: int, # Unique key for/from database
    book_key: str, # Unique key for/from openlibrary
):
    data = {}
    # Get external information (cover image, author, isbn, etc.)
    data["openlibrary"] = await openlibrary_book_data(book_key)
    # Get information from internal database (reviews)

    return data