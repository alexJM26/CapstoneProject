from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from app.services.database.book_service import get_or_create_book
from app.db import get_db
from app.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reviews", tags=["reviews"])


class CreateReviewRequest(BaseModel):
    #book data from Open Library
    title: str
    author_name: Optional[str] = None
    isbn: Optional[str] = None
    first_publish_year: Optional[int] = None
    cover: Optional[str] = None
    
    #review data
    rating: int
    text: Optional[str] = None


@router.post("/create")
async def create_review(
    request: CreateReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Create a review for a book.
    Creates book and author in database if they don't exist.
    """
    try:
        # Validate rating
        if not 0 <= request.rating <= 5:
            raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")
        
        #get or create the book
        book_data = {
            "title": request.title,
            "author_name": request.author_name,
            "isbn": request.isbn,
            "first_publish_year": request.first_publish_year,
            "cover": request.cover
        }
        book_id = await get_or_create_book(db, book_data)
        
        #create review
        await db.execute(
            text("""
                INSERT INTO reviews (user_id, book_id, rating, text)
                VALUES (:user_id, :book_id, :rating, :text)
                ON CONFLICT (user_id, book_id) 
                DO UPDATE SET rating = :rating, text = :text, created_at = now()
            """),
            {
                "user_id": current_user_id, 
                "book_id": book_id, 
                "rating": request.rating,
                "text": request.text
            }
        )
        
        #log activity
        await db.execute(
            text("""
                INSERT INTO activity (user_id, action_type, book_id)
                VALUES (:user_id, 'review', :book_id)
            """),
            {"user_id": current_user_id, "book_id": book_id}
        )
        
        await db.commit()
        
        return {
            "success": True, 
            "book_id": book_id,
            "message": "Review created successfully"
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating review: {e}")
        raise HTTPException(status_code=500, detail=str(e))