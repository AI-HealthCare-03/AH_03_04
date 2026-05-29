from collections.abc import Awaitable, Callable

from fastapi import Request, Response

from app.core import config
from app.core.config import Env

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}


async def add_security_headers(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    response = await call_next(request)

    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)

    response.headers.setdefault("Content-Security-Policy", config.SECURITY_CSP)

    if config.ENV == Env.PROD:
        response.headers.setdefault(
            "Strict-Transport-Security",
            f"max-age={config.HSTS_MAX_AGE_SECONDS}; includeSubDomains",
        )

    return response
