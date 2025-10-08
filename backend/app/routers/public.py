from fastapi import APIRouter, HTTPException, Query
from db import db, doc_fix_ids
from bson import ObjectId

# Notes on MongoDB:
# find: returns a cursor object 
# find_one: returns a document
# Every document gets a _id field automatically unless specifed otherwise. Need to resolve _id and id with Alias in Pydantic or helper function


router = APIRouter()

@router.get("/posts")
async def list_posts(
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
async def get_post_by_slug(slug: str):
    post = await db.posts.find_one({"slug":slug, "status":"published", "is_deleted": {"$eq":False}})
    if not post:
        raise HTTPException(status_code=400, detail="Post Not Found")
    
    return doc_fix_ids(post)

# searching by id creates issues in crawling. Bad for SEO
@router.get("/post-id/{id}")
async def get_post_by_id(id: str):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Id")
    
    post = await db.posts.find_one({"_id":oid, "status": "published", "is_deleted": {"$ne": True}})
    if not post:
        raise HTTPException(status_code=404, detail="Post Not Found")
    
    return doc_fix_ids(post)


