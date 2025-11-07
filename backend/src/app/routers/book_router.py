from fastapi import APIRouter, Depends, HTTPException, Query, Body, FastAPI
from fastapi.exceptions import RequestValidationError

from typing import Optional

from app.services.openlibrary.openlibrary import openlibrary_search
from app.services.filter.book_filter import filter_books
from app.schemas.search_book import SearchBookRequest

router = APIRouter(prefix="/book_router", tags=["openlibrary"])

@router.post("/search")
async def search_book(req: SearchBookRequest):
    q     = req.search or ""
    limit = req.limit
    page  = req.page

    # Get external book information
    data = await openlibrary_search(q, limit=limit, page=page)

    # Filter book only if there is filtering needed
    if req.minRating or req.maxRating or req.pubDateStart or req.pubDateEnd:
        parsed = filter_books(data, req)
    else:
        parsed = data
    
    return parsed
