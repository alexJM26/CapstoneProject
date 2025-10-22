from pathlib import Path
from fastapi import FastAPI, APIRouter, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.future import select
from sqlalchemy.exc import SQLAlchemyError
import logging
from .db import get_db
from .models import Book

from app.routers import book_router as book_router

app = FastAPI()
app.include_router(book_router.router)


REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "frontend"

logging.basicConfig(
    filename='app.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)


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
        logging.error("Failed db_test (SQLAlchemyError): %s", e)
    except Exception as e:
        logging.error(f"Failed db_test %r", e)

@app.get("/books")
async def get_books(db=Depends(get_db)):
    try:
        result = await db.execute(select(Book))
        books = result.scalars().all()
        return books
    except SQLAlchemyError as e:
        logging.error("Failed get_books (SQLAlchemyError): %s", e)
    except Exception as e:
        logging.error(f"Failed get_books %r", e)

app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


logging.info('App started!')