from pathlib import Path
from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles

app = FastAPI()

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "frontend"




api = APIRouter(prefix="/api")

@app.get("/test")
async def test():
    return {"message": "Hello World Test!"}


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")