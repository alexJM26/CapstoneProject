from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
from app.services.database.book_service import get_or_create_book
from app.db import get_db
from app.auth import get_current_user
from app.schemas.requests import AddToReadingListRequest
from app.core.logging import logger


router = APIRouter(prefix="/user_books", tags=["user_books"])

@router.post("/add")
async def add_book_to_reading_list(
    request: AddToReadingListRequest,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Add a book to user's reading list with a status.
    Creates book and author in database if they don't exist.
    """
    try:
        # Validate status
        valid_statuses = ['Want to Read', 'Currently Reading', 'Finished']
        if request.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        
        # Get or create book
        book_id = await get_or_create_book(db, request.dict())
        
        # Check if book exists
        result = await db.execute(
            text("SELECT status FROM user_books WHERE user_id = :user_id AND book_id = :book_id"),
            {"user_id": current_user_id, "book_id": book_id}
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing book
            await db.execute(
                text("""
                    UPDATE user_books 
                    SET status = :status, created_at = now() 
                    WHERE user_id = :user_id AND book_id = :book_id
                """),
                {"user_id": current_user_id, "book_id": book_id, "status": request.status}
            )
            message = f"Book status updated to '{request.status}'"
        else:
            # Insert new book
            await db.execute(
                text("""
                    INSERT INTO user_books (user_id, book_id, status)
                    VALUES (:user_id, :book_id, :status)
                """),
                {"user_id": current_user_id, "book_id": book_id, "status": request.status}
            )
            message = f"Book added to '{request.status}'"
        
        # Log activity
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
            "status": request.status,
            "message": message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"user_books_router [add_book_to_reading_list] - Failed. Error: {e}. Will Rollback Changes.")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my_books")
async def get_user_books(
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get all books for the current user, organized by status.
    """
    try:
        result = await db.execute(
            text("""
                SELECT 
                    ub.status,
                    ub.created_at,
                    b.book_id,
                    b.title,
                    b.isbn,
                    b.year_published,
                    b.cover_img_url,
                    a.name as author_name,
                    r.rating as user_rating,
                    r.text as user_review
                FROM user_books ub
                JOIN books b ON ub.book_id = b.book_id
                LEFT JOIN authors a ON b.author_id = a.author_id
                LEFT JOIN reviews r ON r.book_id = b.book_id AND r.user_id = ub.user_id
                WHERE ub.user_id = :user_id
                ORDER BY ub.created_at DESC
            """),
            {"user_id": current_user_id}
        )
        
        rows = result.fetchall()
        
        # Organize by book status
        books_by_status = {
            'Want to Read': [],
            'Currently Reading': [],
            'Finished': []
        }
        
        # Format response
        for row in rows:
            book_data = {
                'book_id': row.book_id,
                'title': row.title,
                'author_name': row.author_name,
                'isbn': row.isbn,
                'year_published': row.year_published,
                'cover': row.cover_img_url,
                'added_at': row.created_at.isoformat() if row.created_at else None,
                'user_rating': row.user_rating,
                'user_review': row.user_review
            }
            
            if row.status in books_by_status:
                books_by_status[row.status].append(book_data)
        
        return {
            "success": True,
            "books": books_by_status
        }
        
    except Exception as e:
        logger.error(f"user_books_router [get_user_books] - Failed. Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/remove/{book_id}")
async def remove_book_from_reading_list(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Remove a book from user's reading list.
    """
    try:
        # Delete book
        result = await db.execute(
            text("DELETE FROM user_books WHERE user_id = :user_id AND book_id = :book_id"),
            {"user_id": current_user_id, "book_id": book_id}
        )
        
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Book not found in your reading list")
        
        return {
            "success": True,
            "message": "Book removed from reading list"
        }
        
    except HTTPException:
        logger.error(f"user_books_router [remove_book_from_reading_list] - Failed. Error: {e}")
        raise
    except Exception as e:
        logger.error(f"user_books_router [remove_book_from_reading_list] - Failed. Error: {e}. Will Rollback Changes.")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{book_id}")
async def get_book_status(
    book_id: int,
    db: AsyncSession = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """
    Get the status of a specific book for the current user.
    """
    try:
        result = await db.execute(
            text("SELECT status FROM user_books WHERE user_id = :user_id AND book_id = :book_id"),
            {"user_id": current_user_id, "book_id": book_id}
        )
        
        status = result.scalar_one_or_none()
        
        return {
            "success": True,
            "book_id": book_id,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"user_books_router [get_book_status] - Failed. Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))