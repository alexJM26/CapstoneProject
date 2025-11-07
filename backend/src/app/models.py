from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base

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
    user_id = Column(String)
    book_id = Column(Integer, ForeignKey("books.book_id"))
    rating = Column(Integer)
    text = Column(String)