from fastapi import APIRouter, HTTPException, File, UploadFile, Depends, Form, Response, Request
from fastapi.responses import JSONResponse, HTMLResponse
from botocore.exceptions import ClientError
from uuid import uuid4
from pymongo.errors import DuplicateKeyError
from datetime import datetime, timezone
from pathlib import Path
import asyncio
import os
from bson import ObjectId
from concurrent.futures import ProcessPoolExecutor
from typing import Optional

from api_limiter import limiter
from deps import require_admin
from db import db
from objectstore import (
    put_object_from_bytes,
    generate_presigned_get_url,
    s3_client,
)
from utils import compress_image

R2_BUCKET= os.environ.get("R2_BUCKET")
if not R2_BUCKET:
    raise RuntimeError("R2_BUCKET environment variable not set")

router = APIRouter()
#PROCESS_POOL = ProcessPoolExecutor(max_workers=2)

IMAGE_PREFIX = "images"
FROALA_PREFIX = "froala"
HTML_PREFIX = "html"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_SAVE_BYTES = 1 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}
ALLOWED_HTML_TYPES = {"text/html", "application/xhtml+xml"}
BACKEND_BASE = os.environ.get("BACKEND_BASE", "http://localhost:8000")

def _now():
    return datetime.now(timezone.utc)

async def save_asset_doc(doc: dict, uid=None):
    if "path" not in doc:
        raise ValueError("save_asset_doc requires a 'path' field as the unique key")

    now = _now()
    asset_id = uid or uuid4().hex

    update = {
        "$set": {
            "filename": doc.get("filename"),
            "mime": doc.get("mime"),
            "size": doc.get("size"),
            "uploaded_by": doc.get("uploaded_by"),
            "post_id": doc.get("post_id"),
            "used_by_post": doc.get("used_by_post", False),
            "public_link": doc.get("public_link"),
            "updated_at": now,
        },
        "$setOnInsert": {
            "asset_id": asset_id,
            "created_at": doc.get("created_at", now),
            "path": doc["path"],
        },
    }
    await db.assets.update_one({"path": doc["path"]}, update, upsert=True)

    saved = await db.assets.find_one({"path": doc["path"]})
    if not saved:
        
        raise RuntimeError("Upsert succeeded but document could not be fetched")

    return saved
    

# For cover images
@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    post_id: Optional[str] = Form(None),
    alt: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    admin: dict = Depends(require_admin),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported Image Type")
    
    contents = await file.read()
    orig_size = len(contents)

    if orig_size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File is too large")
    
    final_bytes = contents
    ext = Path(file.filename).suffix or ".jpg"
    final_mime = file.content_type

    if orig_size > MAX_SAVE_BYTES:
        loop = asyncio.get_running_loop()
        try: 
            with ProcessPoolExecutor(max_workers=2) as exe:
                final_bytes = await loop.run_in_executor(exe, compress_image, contents, MAX_SAVE_BYTES)
            
            final_mime = "image/jpeg"
            ext = ".jpg"
        except Exception as e:
            print(f"Failed to compress image: {str(e)}")
            final_bytes = contents

    uid = uuid4().hex
    filename = f"{uid}{ext}"
    key = f"{IMAGE_PREFIX}/{filename}"

    #Upload to R2
    try:
        await put_object_from_bytes(final_bytes, R2_BUCKET, key, content_type=final_mime)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")
    
    public_link = generate_presigned_get_url(key, expires_in=3600*24*7)
    now = _now()
    doc = {
        "path":key,
        "filename": filename,
        "mime": final_mime,
        "size": len(final_bytes),
        "uploaded_by": admin.get("clerk_user_id"),
        "post_id": post_id,
        "used_by_post": bool(post_id),
        "alt": alt,
        "caption": caption,
        "public_link": public_link,
        "created_at": now
    }

    saved = await save_asset_doc(doc, uid)
    if post_id:
        try:
            oid = ObjectId(post_id)
            await db.posts.update_one({"_id": oid}, {
                "$set": {
                    "cover_asset_id": saved["asset_id"], 
                    "updated_at": now,
                    "cover_image_key": key,
                    "cover_caption": caption}
            }, upsert=False)
        except Exception:
            pass

    return JSONResponse({"asset_id": saved["asset_id"], "link": public_link})

# Upload from froala -> returns asset get endpoint as link for <img src="..." />
# Also removed security 
@router.post("/froala-image/{post_id}")
@limiter.limit("50/minute")
async def upload_froala_image(request: Request, post_id: str, file: UploadFile = File(...)):

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported Image Type")
    
    contents = await file.read()

    # Won't be using image compression 
    final_bytes = contents
    ext = Path(file.filename).suffix or ".jpg"
    final_mime = file.content_type

    uid = uuid4().hex
    filename = f"{uid}{ext}"
    key = f"{FROALA_PREFIX}/{filename}"

    #Upload to R2
    try:
        await put_object_from_bytes(final_bytes, R2_BUCKET, key, content_type=final_mime)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")
    
    public_link = f"{BACKEND_BASE}/api/assets/{uid}"
    now = _now()
    doc = {
        "path":key,
        "filename": filename,
        "mime": final_mime,
        "size": len(final_bytes),
        "post_id": post_id,
        "used_by_post": bool(post_id),
        "public_link": public_link,
        "created_at": now
    }
    saved = await save_asset_doc(doc, uid)

    if post_id:
        try:
            oid = ObjectId(post_id)
            await db.posts.update_one(
                {"_id": oid},
                {
                    "$set": {"updated_at": now},
                    "$push": {
                        "froala_asset_id_list": saved["asset_id"],
                        "froala_image_key_list": key,
                    },
                }, upsert=False)
        except Exception:
            pass

    return {"link":public_link}


@router.post("/html")
async def upload_html(
    file: UploadFile = File(...),
    slug: Optional[str] = Form(None),
    post_id: Optional[str] = Form(None),
    admin: dict = Depends(require_admin),
):
    if file.content_type not in ALLOWED_HTML_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported File Type")
    
    contents = await file.read()
    name = f"{slug or Path(file.filename).stem}-post.html"
    key = f"{HTML_PREFIX}/{name}"

    try:
        await put_object_from_bytes(contents, R2_BUCKET, key, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Upload failed")
    
    public_link = generate_presigned_get_url(key, expires_in=3600*24*30)
    now = _now()
    doc = {
        "path": key,
        "filename": name,
        "mime": file.content_type,
        "size": len(contents),
        "uploaded_by": admin.get("clerk_user_id"),
        "post_id": post_id,
        "used_by_post": True,
        "public_link": public_link,
        "created_at": now,
    }
    saved = await save_asset_doc(doc)
    if post_id:
        try:
            oid = ObjectId(post_id)
            await db.posts.update_one({"_id": oid}, {
                "$set": {
                    "html_asset_id": saved["asset_id"],
                    "html_key": key,
                    "updated_at": now,
                    "status": "published"
                }
            }, upsert=False)
        except Exception:
            pass

    return JSONResponse({"asset_id": saved["asset_id"], "link":public_link})
    

# This get asset endpoint can fetch both html and cover-images and Froala images but rate limited
@router.get("/{asset_id}")
@limiter.limit("50/minute")
async def get_asset(request: Request, asset_id: str):
    asset = await db.assets.find_one({"asset_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset Not Found")
    
    headers = {"Cache-Control": "public, max-age=3600"}
    key = asset.get("path")
    #print(key)
    loop = asyncio.get_running_loop()
    try:
        res = await loop.run_in_executor(None, lambda: s3_client.get_object(Bucket=R2_BUCKET, Key=key))
        body = res["Body"].read()
        content_type = res.get("ContentType", "application/octet-stream")
        #print(f"R2 response of type: {content_type}")
        if content_type in ALLOWED_HTML_TYPES or key.endswith(".html"):
            html_content = body.decode("utf-8")
            return HTMLResponse(
                content=html_content, 
                headers=headers, 
                media_type="text/html"
            )
        elif content_type in ALLOWED_IMAGE_TYPES or content_type.startswith("image/"):
            return Response(
                content=body,
                media_type=content_type,
                headers=headers
            )
        else:
            return Response(
                content=body, 
                media_type=content_type, 
                headers=headers
            )
        
    except s3_client.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail="Object Not Found")
    except ClientError as ce:
        raise HTTPException(status_code=502, detail=f"Error Fetching Object from Bucket: {str(ce)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error Fetching Object: {str(e)}")

@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, admin: dict = Depends(require_admin)):
    asset = await db.assets.find_one({"asset_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    key = asset["path"]
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: s3_client.delete_object(Bucket=R2_BUCKET, Key=key))

    await db.assets.delete_one({"asset_id": asset_id})
    return JSONResponse({"ok": True})
    
    

