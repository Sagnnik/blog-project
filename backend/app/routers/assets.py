from fastapi import APIRouter, HTTPException, File, UploadFile, Depends, Request
from fastapi.responses import JSONResponse
from uuid import uuid4
import os
import aiofiles
from datetime import datetime, timezone
from bson import ObjectId
from pathlib import Path

from deps import require_admin
from db import db, doc_fix_ids

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}
MAX_FILE_SIZE = 10*1024*1024


# FIXME Don't use this endpoint now. This needs to be merged with the editor
# Re-writing the upload_assets route
@router.post("/assets")
async def upload_assets(
    request: Request,
    file: UploadFile = File(...),
    alt: str = None,
    caption: str=None,
    admin=Depends(require_admin)
):
    """
    Uplaods an image from the editor:
    - validate the content-type and size
    - save file to disk with uuid filename
    - store asset metadata in DB
    - return an asset_id, relative_path, filename and a public_link for the editor
    """

    # Basic validation
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported File type")
    
    #Read the file bytes
    contents = await file.read()
    # if len(contents) > MAX_FILE_SIZE:
    #    raise HTTPException(status_code=400, detail="File Too Large")

    ext = Path(file.filename).suffix or ".png"
    uid = uuid4().hex
    filename = f"{uid}{ext}"

    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    dest = upload_dir/filename

    #Save file asynchronously
    async with aiofiles.open(dest, "wb") as out_files:
        await out_files.write(contents)

    # Build a relative path and public url. Eg :- `/uploads/{filename}`
    stored_path = f"/uploads/{filename}"
    base_url = str(request.base_url).rstrip("/")
    public_url = f"{base_url}{stored_path}"

    #Insert Metadata into DB
    now = datetime.now(timezone.utc)
    doc = {
        "path": stored_path,
        "filename": filename,
        "mime": file.content_type,
        "size": len(contents),
        "uploaded_by": admin.get("clerk_user_id"),
        "post_id": None,
        "used_by_posts": [],
        "alt": alt,
        "caption": caption,
        "created_at": now,
    }

    result = await db.assets.insert_one(doc)
    doc["_id"] = result.inserted_id

    return JSONResponse({
        "asset_id": str(result.inserted_id),
        "path": stored_path,
        "filename": filename,
        "link": public_url
    })


@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, admin=Depends(require_admin)):
    try:
        oid = ObjectId(asset_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    
    asset = await db.assets.find_one({"_id": oid})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # FIXME add a use_by_posts field
    if asset.get("use_by_post"):
        raise HTTPException(status_code=400, detail="Asset is referenced by Post")
    
    #delete file
    local_path = asset["path"].lstrip("/")
    try:
        os.remove(local_path)

    except Exception:
        pass
    
    now = datetime.now(timezone.utc)
    await db.assets.delete_one({"_id": oid})
    return {"ok": True, "at":now}