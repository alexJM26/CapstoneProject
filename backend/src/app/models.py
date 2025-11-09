from sqlalchemy import Column, Integer, String, DateTime, ARRAY, ForeignKey, func
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID

Base = declarative_base()

class Book(Base):
    __tablename__ = "books"

    book_id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    author_id = Column(Integer, ForeignKey("authors.author_id"))
    type = Column(String)
    year_published = Column(Integer)
    isbn = Column(String)
    cover_img_url = Column(String)

class Author(Base):
    __tablename__ = "authors"

    author_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.user_id"))
    book_id = Column(Integer, ForeignKey("books.book_id"))
    rating = Column(Integer)
    text = Column(String)
    created_at = Column(DateTime(timezone=True))

class Collections(Base):
    __tablename__ = "collections"

    collection_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.user_id"))
    name = Column(String)
    description = Column(String)
    icon_id = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Profile(Base):
    __tablename__ = "profiles"

    user_id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    username = Column(String)
    bio = Column(String)
    favorite_genres = Column(ARRAY(String))
    favorite_book = Column(String)
    avatar_choice = Column(Integer)
    created_at = Column(DateTime(timezone=True))

# class CollectionList(Base):
#     __tablename__ = "collection_list"




