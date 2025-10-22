
import logging
import httpx


logger = logging.getLogger(__name__)

BASE_URL = "https://openlibrary.org"
TIMEOUT_TIME = 10


async def search_books(q: str, limit: int = 10, page: int = 1):
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


async def get_by_isbn(isbn: str):
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_TIME) as client:
            res = await client.get(f"{BASE_URL}/isbn/{isbn}.json")
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


async def get_by_key(key: str):
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_TIME) as client:
            res = await client.get(f"{BASE_URL}/books/{key}.json")
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