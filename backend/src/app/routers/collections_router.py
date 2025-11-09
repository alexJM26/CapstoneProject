from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.requests import CreateCollectionRequest
from app.db import get_db
from app.auth import get_current_user
from typing import List, Dict, Any

from app.services.database.collections import create_user_collection, get_collection_id_by_name, get_user_collections

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