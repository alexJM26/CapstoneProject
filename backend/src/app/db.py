import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

#environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

#convert to async format for SQLAlchemy
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

#create async engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

#create session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

#dependency function for FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session