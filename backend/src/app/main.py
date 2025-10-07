from pathlib import Path
from fastapi import FastAPI, APIRouter, Depends
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from .db import get_db

app = FastAPI()

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

app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")