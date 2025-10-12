from fastapi import APIRouter, HTTPException, File, UploadFile, Depends, Request
from fastapi.responses import JSONResponse
from uuid import uuid4
import os
import aiofiles
from datetime import datetime, timezone
from bson import ObjectId
from pathlib import Path
from pymongo.errors import DuplicateKeyError
import httpx

from deps import require_admin
from db import db, doc_fix_ids

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
HTML_UPLOAD_SUBDIR = "html"
ALLOWED_HTML_TYPES = {"text/html", "application/xhtml+xml"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}
MAX_FILE_SIZE = 10*1024*1024


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

    # return JSONResponse({
    #     "asset_id": str(result.inserted_id),
    #     "path": stored_path,
    #     "filename": filename,
    #     "link": public_url
    # })
    return {"link":public_url}


@router.get("/assets/html/{slug}")
async def serve_html(slug : str):

    filename = f"{slug}-post.html"

    asset = await db.assets.find_one({"filename": filename})
    if not asset:
        raise HTTPException(status_code=404, detail="Metadata not found for this file")

    if asset and asset.get("public_link"):
        public_link = asset["public_link"]
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(public_link)
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code,
                                        detail=f"Failed to fetch public_link: {public_link} (status {resp.status_code})")
                html_content = resp.text
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Error fetching public_link: {e}")
        
        metadata = {
            "filename": asset.get("filename"),
            "public_link": public_link,
            "uploaded_by": asset.get("uploaded_by"),
            "created_at": asset.get("created_at"),
            "caption": asset.get("caption"),
            "post_id": asset.get("post_id"),
        }
    

    return {"metadata": metadata, "html": html_content}


# Add a route for saving satic html blog page
@router.post("/assets/html")
async def upload_html_asset(
    request: Request,
    file: UploadFile = File(...),
    post_id: str = None,
    alt: str = None,
    caption: str = None,
    admin=Depends(require_admin)
):
    """
    Save an HTML artifact (final rendered HTML) to disk and register an asset
    Returns: {asset_id, path, filename, link}
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
    upload_dir = Path(UPLOAD_DIR) / HTML_UPLOAD_SUBDIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / filename

    async with aiofiles.open(dest, "wb") as out_files:
        await out_files.write(contents)

    # Build the Mongo Storage File Meatadata
    stored_path = f"/uploads/{HTML_UPLOAD_SUBDIR}/{filename}"
    base_url = str(request.base_url).rstrip("/")
    public_url = f"{base_url}{stored_path}"

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
        asset = await db.assets.find_one({"path": stored_path})


    return JSONResponse({
    "asset_id": str(asset["_id"]),
    "path": asset["path"],
    "filename": asset["filename"],
    "link": asset.get("public_link", public_url),
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