import os
from typing import Optional
import httpx
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from clerk_backend_api import Clerk
from clerk_backend_api.security import authenticate_request
from clerk_backend_api.security.types import AuthenticateRequestOptions
from dotenv import load_dotenv

security = HTTPBearer(auto_error=False)
load_dotenv()

CLERK_API_KEY = os.getenv("CLERK_SECRET_KEY")
ADMIN_CLERK_ID = os.getenv("ADMIN_CLERK_ID")
JWT_KEY = os.getenv("JWT_KEY")
frontend_origins = os.getenv("FRONTEND_BASE", "http://127.0.0.1:5173")

if not CLERK_API_KEY:
    raise RuntimeError("Environment requires CLERK api key")

clerk_client = Clerk(bearer_auth=CLERK_API_KEY)

async def build_httpx_req(request: Request) -> httpx.Request:
    req_body = await request.body()
    url = str(request.url)
    headers = {k.decode() if isinstance(k, bytes) else k:v for k,v in request.headers.items()}
    return httpx.Request(method=request.method, url=url, headers=headers, content=req_body)


async def require_admin(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    # Validate Clerk session token from Auth Headers
    # Verify if the user id matches the clerk admin id

    options = AuthenticateRequestOptions(
        authorized_parties=[frontend_origins] if frontend_origins else None,
        jwt_key=JWT_KEY
    )
    #httpx_req =await build_httpx_req(request)

    request_state = clerk_client.authenticate_request(request, options)

    if not request_state.is_signed_in:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    payload = request_state.payload
    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=403, detail="Invalid Clerk Token Payload")
    
    if clerk_user_id != ADMIN_CLERK_ID:
        raise HTTPException(status_code=403, detail="Forbidden: Admins Only")
    
    admin_user = {
        "clerk_user_id": clerk_user_id,
        "claims": payload,
        "is_admin": True
    }
    return admin_user


