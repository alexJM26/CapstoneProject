
import httpx
from app.core.logging import logger

BASE_URL = "https://openlibrary.org"
TIMEOUT_TIME = 10


async def search_books(q: str, limit: int = 10, page: int = 1):
    """Query the OpenLibrary search API for books matching the given query, with paging and limit."""
    params = {"q": q, "limit": limit, "page": page}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_TIME) as client:
            res = await client.get(f"{BASE_URL}/search.json", params=params)
            res.raise_for_status()
            return res.json()
    except httpx.HTTPStatusError as e:
        logger.error(
            "Failed search_books - HTTP error - status=%s url=%s body=%s",
            getattr(e.response, "status_code", "?"),
            str(getattr(e.request, "url", "?")),
            (getattr(e.response, "text", "") or "")[:200],
        )
        raise
    except httpx.RequestError as e:
        logger.error(
            "Failed search_books - request error - type=%s url=%s",
            e.__class__.__name__,
            str(getattr(e.request, "url", "?"))
            )
        raise
    except Exception as e:
        logger.error(f"Failed search_books - unexpected error - {e}")
        raise