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

router = APIRouter(prefix="/user_books", tags=["user_books"])


class AddToCollectionRequest(BaseModel):
    title: str
    author_name: Optional[str] = None
    isbn: Optional[str] = None
    first_publish_year: Optional[int] = None
    cover: Optional[str] = None
    status: str  # 'Want to Read', 'Currently Reading', 'Finished'


@router.post("/add")
async def add_book_to_collection(
    request: AddToCollectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Add a book to user's collection. 
    Creates book and author in database if they don't exist.
    """
    try:
        #get or create book
        book_id = await get_or_create_book(db, request.dict())
        
        #add to user_books (using raw SQL for now, can be converted to SQLAlchemy)
        #check if already exists
        result = await db.execute(
            text("SELECT 1 FROM user_books WHERE user_id = :user_id AND book_id = :book_id"),
            {"user_id": current_user_id, "book_id": book_id}
        )
        exists = result.scalar_one_or_none()
        
        if exists:
            #update existing
            await db.execute(
                text("""
                    UPDATE user_books 
                    SET status = :status, created_at = now() 
                    WHERE user_id = :user_id AND book_id = :book_id
                """),
                {"user_id": current_user_id, "book_id": book_id, "status": request.status}
            )
        else:
            #insert new
            await db.execute(
                text("""
                    INSERT INTO user_books (user_id, book_id, status)
                    VALUES (:user_id, :book_id, :status)
                """),
                {"user_id": current_user_id, "book_id": book_id, "status": request.status}
            )
        
        #log activity
        await db.execute(
            text("""
                INSERT INTO activity (user_id, action_type, book_id)
                VALUES (:user_id, 'status', :book_id)
            """),
            {"user_id": current_user_id, "book_id": book_id}
        )
        
        await db.commit()
        
        return {
            "success": True, 
            "book_id": book_id,
            "message": f"Book added to {request.status}"
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error adding book to collection: {e}")
        raise HTTPException(status_code=500, detail=str(e))