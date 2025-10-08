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