# deps_admin.py (drop-in)
import os
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions

security = HTTPBearer(auto_error=False)

CLERK_API_KEY   = os.getenv("CLERK_SECRET_KEY")
ADMIN_CLERK_ID  = os.getenv("ADMIN_CLERK_ID")
JWT_KEY         = os.getenv("JWT_KEY")           # Clerk JWT *public* key (PEM)
FRONTEND_BASE   = os.getenv("FRONTEND_BASE")     # e.g. https://sagnnik.github.io

if not CLERK_API_KEY:
    raise RuntimeError("Environment requires CLERK api key")

clerk = Clerk(bearer_auth=CLERK_API_KEY)

async def require_admin(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    # Ensure a token header arrived (either Authorization or Clerk-Token)
    if not (request.headers.get("authorization") or request.headers.get("clerk-token")):
        raise HTTPException(status_code=401, detail="Missing auth token")

    request_state = None
    err_jwt = None

    # 1) Try local JWT verification if key is provided
    if JWT_KEY:
        try:
            opts = AuthenticateRequestOptions(
                jwt_key=JWT_KEY,
                authorized_parties=[FRONTEND_BASE] if FRONTEND_BASE else None,
            )
            request_state = clerk.authenticate_request(request, opts)
        except Exception as e:
            err_jwt = str(e)

    # 2) Fallback: remote verification (supports session tokens)
    if not request_state or not request_state.is_signed_in:
        try:
            request_state = clerk.authenticate_request(request)  # no options
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

    if not request_state.is_signed_in:
        # Surface JWT error once while debugging
        msg = "Unauthorized"
        if err_jwt:
            msg += f" (JWT verify failed: {err_jwt})"
        raise HTTPException(status_code=401, detail=msg)

    payload = request_state.payload or {}

    # Clerk user id can be 'sub' for JWT or 'user_id' for session token
    clerk_user_id = payload.get("sub") or payload.get("user_id")
    if not clerk_user_id:
        raise HTTPException(status_code=403, detail="Invalid Clerk token payload")

    if ADMIN_CLERK_ID and clerk_user_id != ADMIN_CLERK_ID:
        raise HTTPException(status_code=403, detail="Forbidden: Admins Only")

    return {"clerk_user_id": clerk_user_id, "claims": payload, "is_admin": True}
