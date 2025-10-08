from fastapi import APIRouter, HTTPException, File, UploadFile, Depends
from uuid import uuid4
import os
import aiofiles
from datetime import datetime, timezone
from bson import ObjectId

from deps import require_admin
from db import db

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# FIXME Don't use this endpoint now. This needs to be merged with the editor
@router.post("/assets")
async def upload_assets(
    file: UploadFile = File(...),
    alt: str = None,
    caption: str = None,
    admin=Depends(require_admin)
):
    """
    Uploaded images from the editor are saved and returned a corresponding public url
    Updates the metadata of the asset in the DB
    """

    if not file:
        raise HTTPException(status_code=400, detail="No File Uploaded")
    
    ext = os.path.splitext(file.filename)[1]
    uid = uuid4().hex
    filename = f"{uid}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)

    #Writes file asynchronously
    async with aiofiles.open(path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    now = datetime.now(timezone.utc)

    doc = {
        "path": f"/uploads/{filename}",
        "filename": file.filename,
        "mime": file.content_type,
        "size": len(content),
        "uploaded_by": admin["clerk_user_id"],
        "post_id": None,
        "used_by_posts": [],
        "alt": alt,
        "caption": caption,
        "created_at": now
    }

    result = await db.assets.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {
        "asset_id": str(result.inserted_id),
        "path": doc["path"],
        "filename": doc["filename"]
    }

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