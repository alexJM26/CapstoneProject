from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Book, Author
from typing import Optional, Dict, Any
from app.core.logging import logger

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
    """Return book_id if isbn exists, otherwise None."""
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
    """Return the author_id for the given name if it exists, otherwise None."""
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
    """Return the book_id for the given title and author_id if it exists, otherwise None."""
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
    
    book = None
    
    # Try to find existing book by ISBN first
    if book_data.get("isbn"):
        result = await db.execute(
            select(Book).where(Book.isbn == book_data["isbn"])
        )
        book = result.scalar_one_or_none()
        if book:
            logger.info(f"Found existing book by ISBN: {book.book_id}")
    
    # Get or create author
    author_id = None
    if book_data.get("author_name"):
        author_id = await get_or_create_author(db, book_data["author_name"])
    
    # Try to find by title + author
    if not book and author_id:
        result = await db.execute(
            select(Book).where(
                Book.title == book_data["title"],
                Book.author_id == author_id
            )
        )
        book = result.scalar_one_or_none()
        if book:
            logger.info(f"Found existing book by title+author: {book.book_id}")
    
    # Try to find by title alone (case-insensitive) if still not found
    if not book:
        from sqlalchemy import func
        result = await db.execute(
            select(Book).where(
                func.lower(Book.title) == func.lower(book_data["title"])
            )
        )
        book = result.scalar_one_or_none()
        if book:
            logger.info(f"Found book by title only: {book.book_id}")
    
    if book:
        # UPDATE LOGIC: Check if existing book has missing data
        needs_update = False
        
        if not book.cover_img_url and book_data.get("cover"):
            book.cover_img_url = book_data["cover"]
            needs_update = True
            logger.info(f"Adding cover_img_url: {book_data['cover']}")
        
        if not book.isbn and book_data.get("isbn"):
            book.isbn = book_data["isbn"]
            needs_update = True
            logger.info(f"Adding ISBN: {book_data['isbn']}")
        
        if not book.year_published and book_data.get("first_publish_year"):
            book.year_published = book_data["first_publish_year"]
            needs_update = True
            logger.info(f"Adding year: {book_data['first_publish_year']}")
        
        if not book.author_id and author_id:
            book.author_id = author_id
            needs_update = True
            logger.info(f"Adding author_id: {author_id}")
        
        if needs_update:
            db.add(book)
            await db.flush()
            logger.info(f"Updated book {book.book_id} with new data")
        
        return book.book_id
    
    # Create new book
    new_book = Book(
        title=book_data["title"],
        author_id=author_id,
        isbn=book_data.get("isbn"),
        year_published=book_data.get("first_publish_year"),
        cover_img_url=book_data.get("cover")
    )
    db.add(new_book)
    await db.flush()  # Get ID without committing
    
    logger.info(f"Created new book: {new_book.book_id} - {new_book.title}")
    return new_book.book_id

async def get_book_by_data(
    db: AsyncSession, 
    book_data: Dict[str, Any]
) -> Optional[int]:
    """Return the book_id matching the given ISBN or (title + author), otherwise None."""
    # Try to find existing book by ISBN first
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
