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
