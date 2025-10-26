from fastapi import APIRouter, HTTPException, File, Form, UploadFile, Depends, Request
from fastapi.responses import JSONResponse, HTMLResponse
from uuid import uuid4
from bson.errors import InvalidId
import os
from botocore.exceptions import ClientError
from datetime import datetime, timezone
from bson import ObjectId
from pathlib import Path
from pymongo.errors import DuplicateKeyError
import httpx
from typing import Optional
from pymongo import ReturnDocument
import asyncio
from slowapi import Limiter
from slowapi.util import get_remote_address
from concurrent.futures import ProcessPoolExecutor

from deps import require_admin
from db import db, doc_fix_ids
from utils import compress_image
from objectstore import R2_BUCKET, upload_fileobj, generate_presigned_get_url, put_object_from_bytes, s3_client

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
HTML_UPLOAD_SUBDIR = "html"
ALLOWED_HTML_TYPES = {"text/html", "application/xhtml+xml"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}
MAX_UPLOAD_FILE_SIZE = 10*1024*1024
MAX_SAVE_FILE_SIZE = 1*1024*1024
NPX_SERVER_URL = "http://127.0.0.1:8001"
PROCESS_POOL = ProcessPoolExecutor(max_workers=2)


@router.post("/assets")
async def upload_assets(
    request: Request,
    file: UploadFile = File(...),
    alt: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    post_id: Optional[str] = Form(None),
    admin=Depends(require_admin)
):

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported File type")
    

    contents = await file.read()
    orig_size = len(contents)

    if orig_size > MAX_UPLOAD_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File Size Eceeded 5MB")


    orig_ext = Path(file.filename).suffix.lower() or ".png"
    filename= None
    final_bytes = contents
    final_mime = file.content_type

    try:
        if orig_size > MAX_SAVE_FILE_SIZE:
            loop = asyncio.get_running_loop()
            compressed = await loop.run_in_executor(PROCESS_POOL, compress_image, contents, MAX_SAVE_FILE_SIZE)
            final_bytes = compressed
            final_mime = "image/jpeg"
            ext = ".jpg"

        else:
            ext = orig_ext

    except Exception as e:
        ext = orig_ext
        final_bytes = contents
        final_mime = file.content_type

    uid = uuid4().hex
    filename = f"{uid}{ext}"
    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest = upload_dir/filename

    stored_path = f"images/{filename if filename else 'upload.bin'}" 
    try:
        await put_object_from_bytes(final_bytes, R2_BUCKET, stored_path, content_type=final_mime)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Upload Failed") from e
    
    public_url = generate_presigned_get_url(key=stored_path)

    #Insert Metadata into DB
    now = datetime.now(timezone.utc)
    doc = {
        "path": stored_path,
        "filename": filename,
        "mime": final_mime,
        "size": len(final_bytes),
        "uploaded_by": admin.get("clerk_user_id"),
        "post_id": post_id if post_id else None,
        "used_by_posts": bool(post_id),
        "alt": alt,
        "caption": caption,
        "created_at": now,
    }

    try: 
        result = await db.assets.insert_one(doc)

    except Exception:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, lambda: s3_client.delete_object(R2_BUCKET, Key=stored_path))
        raise HTTPException(status_code=500, detail="Failed to save Metadata")

    asset_id_str = str(result.inserted_id)
    await db.assets.update_one(
        {"_id": result.inserted_id},
        {"$set": {"asset_id": asset_id_str, "public_link": public_url}}
    )

    if post_id:
        try:
            post_oid = ObjectId(post_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Post Id format is incorrect")
        
        post = await db.posts.find_one({"_id": post_oid})
        if not post:
            raise HTTPException(status_code=404, detail="Post ID not found")

        if post:
            # soft deleteing the old cover image
            old_cover = post.get("cover_image")
            if old_cover and isinstance(old_cover, dict):
                old_asset_id = old_cover.get("asset_id")
                old_path = old_cover.get("path")
                if old_asset_id:
                    try: 
                        await db.assets.update_one(
                            {"asset_id": old_asset_id},
                            {"$set": {"used_by_posts": False}}
                        )
                    except Exception:
                        pass

            cover_obj = {
                "path": stored_path,
                "filename": filename,
                "mime": final_mime,
                "size": len(final_bytes),
                "uploaded_by": admin.get("clerk_user_id"),
                "post_id": post_id if post_id else None,
                "used_by_posts": bool(post_id),
                "alt": alt,
                "caption": caption,
                "created_at": now,
                "public_link": public_url,
                "asset_id": asset_id_str,
            }

            await db.posts.update_one(
                {"_id": post_oid},
                {"$set" : {"cover_image": cover_obj, "updated_at": now}}
            )

        else:
            raise HTTPException(status_code=404, detail="Post ID not found" )


    return JSONResponse({
        "asset_id": str(result.inserted_id),
        "link":public_url
    })

@router.get("/assets/html/{slug}")
@limiter.limit("10/minute")
async def serve_html(slug : str):

    filename = f"{slug}-post.html"
    key = f"html/{filename}"
    # Searching in db is not needed in most cases

    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, lambda: s3_client.get_object(R2_BUCKET, key))
        html_bytes = response["Body"].read()
        html_content = html_bytes.decode("utf-8")

    except s3_client.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail="HTML file not found in storage")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error fetching HTML from storage: {str(e)}")

    headers = {"Cache-Control": "public, max-age=60"}

    return HTMLResponse(
        content=html_content,
        headers=headers,
        media_type="text/html"
    )


# Add a route for saving satic html blog page
@router.post("/assets/html")
async def upload_html_asset(
    request: Request,
    file: UploadFile = File(...),
    post_id: Optional[str] = Form(None),
    alt: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    admin=Depends(require_admin)
):
    """
    From the frontend:
    {blob, filename, alt, caption, post_id}
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    #Validate Content Type
    if file.content_type not in ALLOWED_HTML_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type for HTML asset")
    
    contents = await file.read()

    ext = Path(file.filename).suffix or ".html"
    if ext.lower() not in (".html", ".htm"):
        ext = ".html"

    filename = file.filename
    stored_path = f"html/{filename if filename else 'html_upload.bin'}"

    # Replacing if previous version exists
    try:
        await put_object_from_bytes(contents, bucket=R2_BUCKET, key=stored_path, content_type=file.content_type)
    except ClientError as e:
        err_msg = e.response.get("Error", {}).get("Message", str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {err_msg}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}") from e
    
    public_url = generate_presigned_get_url(key=stored_path)

    now = datetime.now(timezone.utc)
    doc = {
        "path": stored_path,
        "filename": filename,
        "mime": file.content_type,
        "size": len(contents),
        "uploaded_by": admin.get("clerk_user_id"),
        "post_id": post_id,
        "used_by_posts": True,
        "alt": alt,
        "caption": caption,
        "created_at": now,
        "public_link": public_url,
    }

    try:
        result = await db.assets.insert_one(doc)
        doc["_id"] = result.inserted_id
        asset = doc
    except DuplicateKeyError:
        update_doc = {
            "$set": {
                "filename": filename,
                "mime": file.content_type,
                "size": len(contents),
                "uploaded_by": admin.get("clerk_user_id"),
                "post_id": post_id,
                "used_by_posts": True,
                "alt": alt,
                "caption": caption,
                "public_link": public_url,
                "updated_at": now,
            },
            "$setOnInsert": {
                "created_at": now
            }
        }
        asset = await db.assets.find_one_and_update(
            {"path": stored_path},
            update_doc,
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        
        if asset is None:
            raise HTTPException(status_code=500, detail="Failed to fetch or create asset")
        
    except Exception as e:
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: s3_client.delete_object(R2_BUCKET, stored_path))
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to save metadata: {str(e)}") from e
        
    if post_id:
        try:
            post_oid = ObjectId(post_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Post ID format is incorrect")

        post = await db.posts.find_one({"_id": post_oid})
        if not post:
            raise HTTPException(status_code=404, detail="Post ID not found")
        
        try:
            await db.posts.update_one(
                {"_id": post_oid},
                {
                    "$set": {
                        "html_id": str(asset.get("_id")),
                        "html_link": public_url,
                        "updated_at": now
                    }
                }
            )
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to link html to post")


    return JSONResponse({
    "asset_id": str(asset["_id"]),
    "path": asset["path"],
    "filename": asset["filename"],
    "link": asset.get("public_link", public_url),
    })


@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, admin=Depends(require_admin)):
    asset = await db.assets.find_one({"asset_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    key = asset["path"]
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda:s3_client.delete_object(R2_BUCKET, key))
    now = datetime.now(timezone.utc)

    await db.assets.delete_one({"asset_id": asset_id})
    return {"ok": True, "at":now}