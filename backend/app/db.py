import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/blogdb")
_client = None
db = None

async def init_db():
    global _client, db
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
        db_name = _client.get_default_database().name if _client.get_default_database() else "blogdb"
        db = _client[db_name]


# Helper to convert ObjectId -> str responses
from bson import ObjectId
def oid_str(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    return obj

# Convert top level _id to id(string) and remove the ObjectId from nested fields
def doc_fix_ids(doc: dict):
    if not doc:
        return doc
    
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]

    return doc
