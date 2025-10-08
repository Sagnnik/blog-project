from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class ImageMeta(BaseModel):
    asset_id: str
    path: str
    filename: str
    alt: Optional[str] = None
    caption: Optional[str] = None
    uploaded_at: datetime

class PostCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    summary: Optional[str] = None
    body: str
    cover_image: Optional[str] = None 
    images: Optional[List[ImageMeta]] = []
    tags: Optional[List[str]] = []
    meta: Optional[dict] = {}
    status: Optional[str] = "draft" # Or published

class PostUpdate(PostCreate):
    pass

class PostOut(PostCreate):
    id: str
    author: Optional[dict] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    publised_at: Optional[datetime] = Field(default_factory=datetime.now)
    is_deleted: Optional[bool] = False
