import asyncio
from db import AsyncIOMotorClient, init_db, db
from bson import ObjectId

async def init():
    await init_db()
    from db import db as _db

    print("Creating Indexes...")

    #Posts
    await _db.posts.create_index("slug", unique=True)
    await _db.posts.create_index([("status", 1), ("published_at", -1)])
    await _db.posts.create_index([("is_deleted", 1)])

    #Assets
    await _db.assets.create_index([("path", 1)], unique=True)
    await _db.assets.create_index([("used_by_post", 1)])

    #Users
    await _db.users.create_index("clerk_user_id", unique=True)

    print("Indexes Created")

if __name__ == "__main__":
    asyncio.run(init())



