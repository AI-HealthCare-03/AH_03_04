from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.users import User
from app.repositories.user_repository import UserRepository
from app.services.jwt import JwtService
from app.services.security_audit import SecurityAuditEvent, log_security_event, safe_summary

security = HTTPBearer()


async def get_request_user(
    request: Request,
    credential: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> User:
    token = credential.credentials
    try:
        verified = JwtService().verify_jwt(token=token, token_type="access")
    except HTTPException as exc:
        await log_security_event(
            event_type=SecurityAuditEvent.UNAUTHORIZED_ACCESS,
            request=request,
            status_code=exc.status_code,
            masked_summary=safe_summary({"reason": "invalid_access_token"}),
        )
        raise
    user_id = verified.payload["user_id"]
    user = await UserRepository().get_user(user_id)
    if not user:
        await log_security_event(
            event_type=SecurityAuditEvent.UNAUTHORIZED_ACCESS,
            request=request,
            status_code=status.HTTP_401_UNAUTHORIZED,
            masked_summary=safe_summary({"reason": "user_not_found"}),
        )
        raise HTTPException(detail="Authenticate Failed.", status_code=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        await log_security_event(
            event_type=SecurityAuditEvent.UNAUTHORIZED_ACCESS,
            request=request,
            user_id=user.id,
            status_code=status.HTTP_423_LOCKED,
            masked_summary=safe_summary({"reason": "inactive_user"}),
        )
        raise HTTPException(detail="비활성화된 계정입니다.", status_code=status.HTTP_423_LOCKED)
    return user
