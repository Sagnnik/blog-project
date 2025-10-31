from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
import os
import sys
from routers import posts, public, assetsv2
from db import init_db
from init_index import init as init_indexes
from api_limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware

app = FastAPI(title="Blog Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

origins = [
    "https://sagnnik.github.io",
    "https://vectorthoughts.xyz",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
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
# UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
# os.makedirs(UPLOAD_DIR, exist_ok=True)
# app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
# Mount the static published director

@app.get("/health")
def health():
    return {"ok": True}

app.include_router(public.router, prefix="/api/public")
app.include_router(posts.router, prefix="/api")
app.include_router(assetsv2.router, prefix="/api/assets")