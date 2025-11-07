from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Book, Author #NEED TO ADD AUTHOR MODEL
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


async def get_or_create_author(db: AsyncSession, author_name: str) -> Optional[int]:
    """Get existing author or create new one. Returns author_id."""
    if not author_name:
        return None
    
    #check if author exists
    result = await db.execute(
        select(Author).where(Author.name == author_name)
    )
    author = result.scalar_one_or_none()
    
    if author:
        return author.author_id
    
    #create new author
    new_author = Author(name=author_name)
    db.add(new_author)
    await db.flush()  #get ID without committing
    return new_author.author_id

async def get_book_by_isbn(db: AsyncSession, isbn) -> Optional[int]:
    if book_data.get("isbn"):
        result = await db.execute(
            select(Book).where(Book.isbn == book_data["isbn"])
        )
        book = result.scalar_one_or_none()
        if book:
            logger.info(f"Found existing book by ISBN: {book.book_id}")
            return book.book_id
    return None

async def get_author(db: AsyncSession, author_name: str) -> Optional[int]:
    if not author_name:
        return None
    result = await db.execute(
        select(Author).where(Author.name == author_name)
    )
    author = result.scalar_one_or_none()
    
    if author:
        return author.author_id

    return None

async def find_book_id_by_title_author(db: AsyncSession, title: str, author_id: int) -> Optional[int]:
    result = await db.execute(
        select(Book).where(
            Book.title == title,
            Book.author_id == author_id
        )
    )
    book = result.scalar_one_or_none()
    if book:
        logger.info(f"Found existing book by title+author: {book.book_id}")
        return book.book_id
    return None

# TODO: Use helper functions such as get_author, get_book_by_isbn, and find_book_id_by_title_author
async def get_or_create_book(
    db: AsyncSession, 
    book_data: Dict[str, Any]
) -> int:
    """
    Get existing book or create new one from Open Library data.
    Returns book_id.
    
    book_data should contain:
    - title: str
    - author_name: str (optional)
    - isbn: str (optional)
    - first_publish_year: int (optional)
    - cover: str (optional, the cover URL)
    """
    
    #try to find existing book by ISBN first
    if book_data.get("isbn"):
        result = await db.execute(
            select(Book).where(Book.isbn == book_data["isbn"])
        )
        book = result.scalar_one_or_none()
        if book:
            logger.info(f"Found existing book by ISBN: {book.book_id}")
            return book.book_id
    
    #get or create author
    author_id = None
    if book_data.get("author_name"):
        author_id = await get_or_create_author(db, book_data["author_name"])
    
    #try to find by title + author
    if author_id:
        result = await db.execute(
            select(Book).where(
                Book.title == book_data["title"],
                Book.author_id == author_id
            )
        )
        book = result.scalar_one_or_none()
        if book:
            logger.info(f"Found existing book by title+author: {book.book_id}")
            return book.book_id
    
    #create new book
    new_book = Book(
        title=book_data["title"],
        author_id=author_id,
        isbn=book_data.get("isbn"),
        year_published=book_data.get("first_publish_year"),
        cover_img_url=book_data.get("cover")
    )
    db.add(new_book)
    await db.flush()  #get ID without committing
    
    logger.info(f"Created new book: {new_book.book_id} - {new_book.title}")
    return new_book.book_id

async def get_book_by_data(
    db: AsyncSession, 
    book_data: Dict[str, Any]
) -> Optional[int]:

    #try to find existing book by ISBN first
    if book_data.get("isbn"):
        ok, book_id = await get_book_by_isbn(db, book_data["isbn"])
        if ok:
            return book_id
    
    # Get author
    author_id = None
    if book_data.get("author_name"):
        author_id = await get_author(db, book_data["author_name"])
        # Book must not exist if author doesn't exist
        if not author_id:
            return None
    
    # Find by title + author
    if book_data.get("title") and author_id:
        book_id = await find_book_id_by_title_author(db, book_data.get("title"), author_id)
        if book_id:
            return book_id
    return None
