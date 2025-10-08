from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys
from routers import posts, public, assets
from db import init_db
from init_index import init as init_indexes

app = FastAPI(title="Blog Backend")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
# Need to add the github pages origins

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"],
    allow_credentials = True
)

# Initiate DB
@app.on_event("startup")
async def startup():
    await init_db()

    try:
        await init_indexes()
    except Exception as e:
        print("Index init failed:", e)

# Mount static uploads directory
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
# Mount the static published director

app.include_router(public.router, prefix="/api/public")
app.include_router(posts.router, prefix="/api")
app.include_router(assets.router, prefix="/api")