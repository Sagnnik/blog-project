from fastapi import APIRouter, HTTPException, File, UploadFile, Depends
from uuid import uuid4
import os
import aiofiles
from datetime import datetime

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

    now = datetime.now(datetime.timezone.utc)

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
    pass