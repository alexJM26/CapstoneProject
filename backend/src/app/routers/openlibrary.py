from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.openlibrary_client import search_books, get_by_isbn

router = APIRouter(prefix="/openlibrary", tags=["openlibrary"])

# TODO: Limit total outgoing API requests < limit
#   We could show out a 'Please try again' message or add a queue for requests.

@router.get("/search")
async def openlibrary_search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
):
    data = await search_books(q, limit=limit, page=page)
    docs = data.get("docs", []) or []

    # Format response
    results = []
    for d in docs:
        # Tries multiple ways of getting the cover
        cover = None
        if (ci := d.get("cover_i")) is not None:
            cover = f"https://covers.openlibrary.org/b/id/{ci}-M.jpg"
        elif (isbns := d.get("isbn")):
            cover = f"https://covers.openlibrary.org/b/isbn/{isbns[0]}-M.jpg"
        elif (olid := d.get("cover_edition_key")):
            cover = f"https://covers.openlibrary.org/b/olid/{olid}-M.jpg"
        # Append only req results
        results.append({
            "title": d.get("title"),
            "authors": d.get("author_name"),
            "first_publish_year": d.get("first_publish_year"),
            "isbn": (d.get("isbn") or [None])[0],
            "cover": cover,
        })
    return {"total": data.get("numFound", 0), "results": results}