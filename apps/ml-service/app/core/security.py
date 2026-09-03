from fastapi import Header, HTTPException, status

from app.core.config import get_settings


async def verify_api_key(authorization: str = Header(default="")) -> None:
    settings = get_settings()
    token = authorization.removeprefix("Bearer ").strip()
    if not token or token != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing API key")
