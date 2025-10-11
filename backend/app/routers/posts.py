from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
from bson import ObjectId
from models import PostCreate, PostUpdate
from deps import require_admin
from db import db, doc_fix_ids
import asyncio
from typing import Optional
from uuid import uuid4

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
async def create_post(payload: Optional[PostCreate]=None, admin=Depends(require_admin)):
    now = datetime.now(timezone.utc)
    payload = payload or PostCreate()
    doc = payload.dict()

    doc.update({
        "author": {"clerk_user_id": admin["clerk_user_id"], "name": admin.get("name")},
        "created_at": now,
        "status":"draft",
        "is_deleted": False

    })

    if doc.get("slug") is None:
        doc["slug"] = uuid4().hex
        
    result = await db.posts.insert_one(doc)         # Returns an insertOneResult Object not the doc
    return {"id":str(result.inserted_id)}           # Use .inserted_id to fetch the doc id from insertOneResult object

@router.patch("/posts/{id}")
async def update_post(id: str, payload: PostUpdate, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)

    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Id")
    
    post = await db.posts.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post Not Found")
    
    data = payload.dict(exclude_unset=True)

    #If slug is updated change uniqueness
    if data.get("slug") != post.get("slug"):
        if await db.posts.find_one({"slug": data["slug"], "_id": {"$ne": oid}}):
            raise HTTPException(status_code=409, detail="slug exists")
        
    data["updated_at"] = datetime.now(timezone.utc)
    if data.get("status") == "published" and not post.get("published_at"):
        data["published_at"] = datetime.now(timezone.utc)

    await db.posts.update_one({"_id": oid}, {"$set": data})
    new_doc = await db.posts.find_one({"_id": oid})
    return doc_fix_ids(new_doc)

@router.patch("/posts/{id}/publish")
async def publish_post(
    id: str, 
    payload: dict = Body(...),
    admin=Depends(require_admin)
):
    try:
        oid = ObjectId(id)

    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Id")
    
    post = await db.posts.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Not found")
    
    now=datetime.now(timezone.utc)
    html_id = payload.get("htmlId") or payload.get("html_id")
    html_link = payload.get("htmlLink") or payload.get("html_link")
    if html_link:
        await db.posts.update_one({"_id": oid}, {
            "$set": {
                "html_id": html_id,
                "html_link": html_link,
                "status": "published",
                "published_at": now,
                "updated_at": now
            }
        })
    else:
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
    now = datetime.now(timezone.utc)

    update = {"status": status, "updated_at": now}
    if status == "published":
        update["published_at"] = now

    await db.posts.update_one({"_id": oid}, {"$set": update})
    return {"ok": True, "at": now}

@router.patch("/posts/{id}/delete")
async def soft_delete(id: str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    now = datetime.now(timezone.utc)

    await db.posts.update_one({"_id": oid}, {
        "$set": {
            "is_deleted": True,
            "deleted_at": now,
            "deleted_by": admin["clerk_user_id"]
        }
    })

    post = await db.posts.find_one({"_id": oid})
    return doc_fix_ids(post)

@router.patch("/posts/{id}/restore")
async def restore_post(id:str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    
    now = datetime.now(timezone.utc)
    await db.posts.update_one({"_id": oid},{
        "$set": {"is_deleted":False, "updated_at": now},
        "$unset": {"deleted_at": "", "deleted_by": ""}
    })

    post = await db.posts.find_one({"_id":oid})
    return doc_fix_ids(post)