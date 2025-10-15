from pathlib import Path
from fastapi import FastAPI, APIRouter, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.future import select
from .db import get_db
from .models import Book

from app.routers import openlibrary as openlibrary_router

app = FastAPI()
app.include_router(openlibrary_router.router)


REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "frontend"




api = APIRouter(prefix="/api")

@app.get("/test")
async def test():
    return {"message": "Hello World Test!"}

@app.get("/db-test")
async def db_test(db=Depends(get_db)):
    result = await db.execute(text("SELECT NOW();"))
    current_time = result.scalar_one()
    return {"database_time": str(current_time)}

@app.get("/books")
async def get_books(db=Depends(get_db)):
    result = await db.execute(select(Book))
    books = result.scalars().all()
    return books

app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")