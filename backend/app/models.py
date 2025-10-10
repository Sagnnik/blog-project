from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

class ImageMeta(BaseModel):
    asset_id: str
    path: str
    filename: str
    alt: Optional[str] = None
    caption: Optional[str] = None
    uploaded_at: datetime
    used_by_post: bool = False
    post_id: Optional[str] = None

class PostCreate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    summary: Optional[str] = None
    body: Optional[str] = None
    html_id: Optional[str] = None
    html_link: Optional[str] = None
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
    created_at: Optional[datetime] = Field(default_factory=datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    publised_at: Optional[datetime] = Field(default_factory=datetime.now(timezone.utc))
    is_deleted: Optional[bool] = False
