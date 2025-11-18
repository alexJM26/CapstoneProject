from pydantic import BaseModel, Field, conint
from typing import Optional

class SearchBookRequest(BaseModel):
    # Required
    search: str

    # Optional
    limit: conint(ge=1, le=50) = 10
    page: conint(ge=1) = 1
    minRating: Optional[int] = Field(None, alias="minRating")
    maxRating: Optional[int] = Field(None, alias="maxRating")
    pubDateStart: Optional[str] = Field(None, alias="pubDateStart")
    pubDateEnd: Optional[str] = Field(None, alias="pubDateEnd")


class CreateCollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    iconId: int = Field(..., ge=1, le=21)  #Fixed to match the 21 icon options we now have

class CollectionSearchRequest(BaseModel):
    search: Optional[str] = None
    pubDateStart: Optional[str] = None
    pubDateEnd: Optional[str] = None
