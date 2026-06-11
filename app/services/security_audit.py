from enum import StrEnum

from fastapi import Request

from app.core import default_logger
from app.models.security import SecurityAuditLog


class SecurityAuditEvent(StrEnum):
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGIN_RATE_LIMITED = "LOGIN_RATE_LIMITED"
    GOOGLE_LOGIN_SUCCESS = "GOOGLE_LOGIN_SUCCESS"
    GOOGLE_LOGIN_FAILED = "GOOGLE_LOGIN_FAILED"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED"
    EMAIL_VERIFICATION_REQUESTED = "EMAIL_VERIFICATION_REQUESTED"
    EMAIL_VERIFIED = "EMAIL_VERIFIED"
    TOKEN_REFRESH = "TOKEN_REFRESH"
    LOGOUT = "LOGOUT"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"


def mask_email(email: str | None) -> str | None:
    if not email:
        return None
    local, sep, domain = email.partition("@")
    if not sep:
        return "***"
    if len(local) <= 2:
        masked_local = f"{local[:1]}***"
    else:
        masked_local = f"{local[:2]}***"
    return f"{masked_local}@{domain}"


def request_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()[:45]
    return request.client.host[:45] if request.client else None


def request_user_agent(request: Request | None) -> str | None:
    if request is None:
        return None
    user_agent = request.headers.get("user-agent")
    return user_agent[:255] if user_agent else None


def safe_summary(parts: dict[str, object | None]) -> str:
    safe_parts = []
    for key, value in parts.items():
        if value is None:
            continue
        safe_parts.append(f"{key}={value}")
    return "; ".join(safe_parts)[:500]


async def log_security_event(
    *,
    event_type: SecurityAuditEvent | str,
    request: Request | None = None,
    user_id: int | None = None,
    status_code: int | None = None,
    masked_summary: str | None = None,
) -> None:
    try:
        await SecurityAuditLog.create(
            user_id=user_id,
            event_type=str(event_type),
            request_path=str(request.url.path)[:255] if request else None,
            http_method=request.method[:10] if request else None,
            ip_address=request_ip(request),
            user_agent=request_user_agent(request),
            status_code=status_code,
            masked_summary=masked_summary[:500] if masked_summary else None,
        )
    except Exception:
        default_logger.exception("security audit log write failed")
