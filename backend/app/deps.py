import os
from fastapi import Depends, Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db import db

security = HTTPBearer(auto_error=False)

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "admin123")

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    '''
    local-dev admin auth
    Expects Autorization: Bearer <token>
    FIXME replace this with Clerk JWT verification
    '''

    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing auth header")
    
    token = credentials.credentials
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # For local dev return a fake admin user object
    admin_user = {
        "clerk_user_id": "local-admin",
        "email": "Admin@gmail.com",
        "name": "Admin",
        "is_admin": True
    }

    return admin_user