from fastapi import APIRouter, HTTPException, Query, Request
from db import db, doc_fix_ids
from bson import ObjectId
from api_limiter import limiter

router = APIRouter()


@router.get("/posts")
@limiter.limit("50/minute")
async def list_posts(
    request: Request,
    limit: int=10,
    skip: int=0,
    tag: str=None,
    q: str=None
):
    query = {"status": "published", "is_deleted": {"$eq":False}}
    if tag:
        query["tags"] = tag

    if q:
        # Simple text search on title or summary
        # Searches based on similar q on title or summary without considering case
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"summary": {"$regex":q, "$options":"i"}}]

    cursor = db.posts.find(query).sort("published_at", -1).skip(skip).limit(limit) # Skips the first x query and limits to y number of queries
    docs = await cursor.to_list(length=limit)

    return [doc_fix_ids(d) for d in docs]

@router.get("/post/{slug}")
@limiter.limit("50/minute")
async def get_post_by_slug(request: Request, slug: str):
    post = await db.posts.find_one({"slug":slug, "status":"published", "is_deleted": {"$eq":False}})
    if not post:
        raise HTTPException(status_code=400, detail="Post Not Found")
    
    return doc_fix_ids(post)

# searching by id creates issues in crawling. Bad for SEO
@router.get("/post-id/{id}")
@limiter.limit("50/minute")
async def get_post_by_id(request: Request, id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Id")
    
    post = await db.posts.find_one({"_id":oid, "status": "published", "is_deleted": {"$ne": True}})
    if not post:
        raise HTTPException(status_code=404, detail="Post Not Found")
    
    return doc_fix_ids(post)




