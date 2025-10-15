

import httpx



BASE_URL = "https://openlibrary.org"
TIMEOUT_TIME = 10


async def search_books(q: str, limit: int = 10, page: int = 1):
    params = {"q": q, "limit": limit, "page": page}
    
    async with httpx.AsyncClient(timeout=TIMEOUT_TIME) as client:
        res = await client.get(f"{BASE_URL}/search.json", params=params)
        res.raise_for_status()
        return res.json()


async def get_by_isbn(isbn: str):
    async with httpx.AsyncClient(timeout=TIMEOUT_TIME) as client:
        res = await client.get(f"{BASE_URL}/isbn/{isbn}.json")
        res.raise_for_status()
        return res.json()