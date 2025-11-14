from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.schemas.requests import CreateCollectionRequest
from app.db import get_db
from app.auth import get_current_user
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy import text

from app.services.database.collections import create_user_collection, get_collection_id_by_name, get_user_collections
from app.services.database.book_service import get_or_create_book

router = APIRouter(prefix="/collections", tags=["collections"])

@router.post("/create_collection")
async def create_collection(
    req: CreateCollectionRequest, 
    db = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    try:
        exists_id = await get_collection_id_by_name(db, current_user_id, req.name)
        if exists_id:
            await db.rollback()
            return {"success": False, "error": "collection name already created"}

        coll_id = await create_user_collection(db, current_user_id, req.name, req.iconId)
        if coll_id is None:
            await db.rollback()
            return {"success": False, "error": "invalid_input"}
        
        await db.commit()
        return {"success": True, "collectionId": coll_id, "created": True}
    except Exception as e:
        print(f"Error: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create collection")


@router.get("/get_collections")
async def get_collections(
    db = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    print("GET USER COLLECTIONS!\n\n")
    try:
        # Get all collections owned by a user
        rows = await get_user_collections(db, current_user_id)

        # Build list so that the HTML can understand it
        data: List[Dict[str, Any]] = [ 
            {
                "collectionId": str(r.collection_id),
                "name": r.name,
                "iconId": r.icon_id,
                "createdAt": r.created_at.isoformat(),
            }
            for r in rows
        ]

        print("data: ", data)

        return {"success": True, "collections": data}

    except Exception as e: # TODO: Add logging
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user collections")


class AddBookToCollectionsRequest(BaseModel):
    title: str
    author_name: Optional[str] = None
    isbn: Optional[str] = None
    first_publish_year: Optional[int] = None
    cover: Optional[str] = None
    collection_ids: List[int]

@router.post("/add_book")
async def add_book_to_collections(
    req: AddBookToCollectionsRequest,
    db = Depends(get_db),
    current_user_id: str = Depends(get_current_user),  #makes sure user is authenticated
):
    #Adds a book to one or more user collections and creates the book if it doesn't exist.

    try:
        #Get or create the book first
        book_id = await get_or_create_book(db, req.dict())

        #Insert book into each selected collection
        for coll_id in req.collection_ids:
            await db.execute(
                text("""
                    INSERT INTO collection_books (collection_id, book_id)
                    VALUES (:collection_id, :book_id)
                    ON CONFLICT DO NOTHING
                """),
                {"collection_id": coll_id, "book_id": book_id}
            )

        await db.commit()
        return {"success": True, "book_id": book_id, "added_to": req.collection_ids}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add book to collections: {e}")


@router.get("/get_collection_books/{collection_id}")
async def get_collection_books(
    collection_id: int,
    db = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    #Return all books in a user's specific collection with joined author and book details
    try:
        #Verify collection belongs to current user
        ownership_check = await db.execute(
            text("SELECT 1 FROM collections WHERE collection_id = :cid AND user_id = :uid"),
            {"cid": collection_id, "uid": current_user_id}
        )
        if ownership_check.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Not authorized to view this collection")

        #Retrieve books joined with book details
        result = await db.execute(text("""
            SELECT b.book_id, b.title, a.name AS author_name, b.year_published, b.isbn, b.cover_img_url
            FROM collection_books cb
            JOIN books b ON cb.book_id = b.book_id
            LEFT JOIN authors a ON b.author_id = a.author_id
            WHERE cb.collection_id = :cid
            ORDER BY cb.position NULLS LAST, b.title
        """), {"cid": collection_id})

        rows = result.mappings().all()
        books = [dict(r) for r in rows]

        return {"success": True, "collection_id": collection_id, "books": books}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching books for collection {collection_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get collection books")


@router.delete("/remove_book/{collection_id}/{book_id}")
async def remove_book_from_collection(
    collection_id: int,
    book_id: int,
    db = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    #Remove a single book from user's collection
    try:
        #verify ownership
        ownership = await db.execute(
            text("SELECT 1 FROM collections WHERE collection_id=:cid AND user_id=:uid"),
            {"cid": collection_id, "uid": current_user_id}
        )
        if ownership.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Not authorized")

        #Delete the link
        await db.execute(
            text("DELETE FROM collection_books WHERE collection_id=:cid AND book_id=:bid"),
            {"cid": collection_id, "bid": book_id}
        )
        await db.commit()
        return {"success": True, "removed": book_id}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/update_position/{collection_id}/{book_id}")
async def update_book_position(
    collection_id: int,
    book_id: int,
    new_position: int = Query(..., description="The new position for this book"),
    db = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    try:
        #Verify ownership
        ownership = await db.execute(
            text("SELECT 1 FROM collections WHERE collection_id=:cid AND user_id=:uid"),
            {"cid": collection_id, "uid": current_user_id}
        )
        if ownership.scalar_one_or_none() is None:
            raise HTTPException(status_code=403, detail="Not authorized")

        #Update position
        await db.execute(
            text("""
                UPDATE collection_books
                SET position = :pos
                WHERE collection_id = :cid AND book_id = :bid
            """),
            {"pos": new_position, "cid": collection_id, "bid": book_id}
        )

        await db.commit()
        return {"success": True, "book_id": book_id, "new_position": new_position}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))