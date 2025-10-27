from fastapi import APIRouter, HTTPException, File, UploadFile, Depends, Form
from fastapi.responses import JSONResponse, HTMLResponse
from uuid import uuid4
from datetime import datetime, timezone
from pathlib import Path
import asyncio
from concurrent.futures import ProcessPoolExecutor
from typing import Optional

from deps import require_admin
from db import db
from objectstore import (
    put_object_from_bytes,
    generate_presigned_get_url,
    generate_presigned_put_url,
    s3_client,
    R2_BUCKET,
)
from utils import compress_image

router = APIRouter()
PROCESS_POOL = ProcessPoolExecutor(max_workers=2)

IMAGE_PREFIX = "images"
FROALA_PREFIX = "froala"
HTML_PREFIX = "html"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_SAVE_BYTES = 1 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}

def now():
    return datetime.now(timezone.utc)

async def save_asset_doc(doc: dict):
    res = await db.assets.insert_one(doc)
    asset_id = uuid4().hex 

    await db.assets.update_one({"_id": res.inserted_id}, {
        "$set": {"asset_id": asset_id}
    })

    doc["_id"] = res.inserted_id
    doc["asset_id"] = asset_id
    return doc

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
            final_bytes = await loop.run_in_executor(PROCESS_POOL, compress_image, MAX_SAVE_BYTES)
            final_mime = "image/jpeg"
            ext = ".jpg"
        except Exception:
            final_bytes = contents

    uid = uuid4().hex
    
