from pathlib import Path
from fastapi import FastAPI, APIRouter, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
from app.core.logging import logger
from .db import get_db
from .models import Book

from app.routers import book_router, user_books_router, reviews_router, collections_router

app = FastAPI()
app.include_router(book_router.router)
app.include_router(user_books_router.router)
app.include_router(reviews_router.router)
app.include_router(collections_router.router)


REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "frontend"



api = APIRouter(prefix="/api")

@app.get("/test")
async def test():
    return {"message": "Hello World Test!"}

@app.get("/db-test")
async def db_test(db=Depends(get_db)):
    try:
        result = await db.execute(text("SELECT NOW();"))
        current_time = result.scalar_one()
        return {"database_time": str(current_time)}
    except SQLAlchemyError as e:
        logger.error("Failed db_test (SQLAlchemyError): %s", e)
    except Exception as e:
        logger.error(f"Failed db_test %r", e)

@app.get("/books")
async def get_books(db=Depends(get_db)):
    try:
        result = await db.execute(select(Book))
        books = result.scalars().all()
        return books
    except SQLAlchemyError as e:
        logger.error("Failed get_books (SQLAlchemyError): %s", e)
    except Exception as e:
        logger.error(f"Failed get_books %r", e)

app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


logger.info('App started!')