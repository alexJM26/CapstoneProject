from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from app.services.database.book_service import get_book_by_data
from app.services.database.reviews import get_book_rating, get_book_reviews
from app.services.database.profile import get_username_with_id

# Helper function to add ratings to search results
async def add_ratings_to_results(
    db: AsyncSession, 
    data: Dict[str, Any]
) -> Dict[str, Any]:

    results: List[Dict[str, Any]] = data.get("results", [])

    # Helper function that returns a rating given book data
    async def _get_rating(book_id: int) -> Tuple[Optional[float], int]:
        avg, count, _ = await get_book_rating(db, book_id)
        return (
            float(avg) if avg is not None else None,
            int(count) if count is not None else 0,
        )

    # Helper function that will get all the reviews, get usernames, and only return back what the client needs
    async def _get_reviews(book_id: int):
        reviews_raw = await get_book_reviews(db, book_id)
        reviews = []

        for review in reviews_raw:
            user_id = review.user_id
            username = ""
            if user_id:
                username = await get_username_with_id(db, user_id)
            
            # after username, we will get
            reviews.append({
                "username": username,
                "text": review.text,
                "rating": review.rating,
                "created_at": review.created_at,
            })
        print("reviews: ", reviews)
        return reviews

    # Go through all the books, and add their ratings/reviews
    for book in results:
        authors = book.get("authors")
        author_name = authors[0] if isinstance(authors, list) and authors else book.get("author_name")
        book_id = await get_book_by_data(db, {
            "title": book.get("title"),
            "isbn": book.get("isbn"),
            "author_name": author_name,
        })
        if not book_id: # No review if there is no book id
            continue
        
        rating, count = await _get_rating(book_id)
        reviews = await _get_reviews(book_id)

        book["book_rating"] = rating
        book["book_rating_count"] = count
        book["book_reviews"] = reviews

    return data