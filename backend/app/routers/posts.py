from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from models import PostCreate, PostUpdate
from deps import require_admin
from db import db, doc_fix_ids
import asyncio

# Notes on MongoDB
# data.get["slug"] returns None if key is not found
# data["slug"] returns KeyError if key is not Found

router = APIRouter()

#Admin Endpoints
@router.get("/posts")
async def admin_list_posts(
    limit: int=50, 
    skip: int=0,
    status: str = None,
    is_deleted: bool = None,
    admin = Depends(require_admin)
):
    q = {}
    if status:
        q["status"] = status

    if is_deleted is not None:
        q["is_deleted"] = is_deleted

    cursor = db.posts.find(q).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return [doc_fix_ids(d) for d in docs]

@router.get("/posts/{id}")
async def admin_get_post(id: str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)

    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Id")
    
    post = await db.posts.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post Not Found")
    
    return doc_fix_ids(post)

@router.post("/posts")
async def create_post(payload: PostCreate, admin=Depends(require_admin)):
    now = datetime.now(datetime.timezone.utc)
    doc = payload.dict()

    # Complete the fields
    doc.update({
        "author": {"clerk_user_id": admin["clerk_user_id"], "name": admin.get("name")},
        "created_at": now,
        "updated_at": now,
        "published_at": now if doc.get("status") == "published" else None,
        "is_deleted": False
    })

    # Slug Uniqueness check if provided
    if doc.get("slug"):
        existing = await db.posts.find_one({"slug": doc["slug"]})
        if existing:
            raise HTTPException(status_code=409, detail="slug already exists")
        
    result = await db.posts.insert_one(doc)         # Returns an insertOneResult Object not the doc
    return {"id":str(result.inserted_id)}           # Use .inserted_id to fetch the doc id from insertOneResult object

@router.put("/posts/{id}")
async def update_post(id: str, payload: PostUpdate, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)

    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Id")
    
    post = await db.posts.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post Not Found")
    
    data = payload.dict()

    #If slug is updated change uniqueness
    if data.get("slug") != post.get("slug"):
        if await db.posts.find_one({"slug": data["slug"], "_id": {"$ne": oid}}):
            raise HTTPException(status_code=409, detail="slug exists")
        
    data["updated_at"] = datetime.now(datetime.timezone.utc)
    if data.get("status") == "published" and not post.get("published_at"):
        data["published_at"] = datetime.now(datetime.timezone.utc)

    await db.posts.update_one({"_id": oid}, {"$set": data})
    new_doc = await db.posts.find_one({"_id": oid})
    return doc_fix_ids(new_doc)

@router.post("/posts/{id}/publish")
async def publish_post(id: str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)

    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Id")
    
    post = await db.posts.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    
    now=datetime.now(datetime.timezone.utc)
    await db.posts.update_one({"_id": oid}, {
        "$set": {
            "status": "published",
            "published_at": now,
            "updated_at": now
        }
    })

    updated = await db.posts.find_one({"_id":oid})
    return doc_fix_ids(updated)

@router.patch("/posts/{id}/status")
async def change_status(id: str, status: str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    now = datetime.now(datetime.timezone.utc)

    update = {"satus": status, "updated_at": now}
    if status == "published":
        update["published_at"] = now

    await db.posts.update_one({"_id": oid}, {"$set": update})
    return {"ok": True, "at": now}

# FIXME should use patch method i think
@router.delete("/posts/{id}")
async def soft_delete(id: str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    now = datetime.now(datetime.timezone.utc)

    await db.posts.update_one({"_id": oid}, {
        "$set": {
            "is_deleted": True,
            "deleted_at": now,
            "deleted_by": admin["clerk_user_id"]
        }
    })

    return {"ok": True, "at": now}

@router.post("/posts/{id}/restore")
async def restore_post(id:str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    
    await db.posts.update_one({"_id": oid},{
        "$set": {"is_deleted":False},
        "$unset": {"deleted_at": "", "deleted_by": ""}
    })

    post = await db.posts.find_one({"_id":oid})
    return doc_fix_ids(post)