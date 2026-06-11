from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.responses import Response

from app.core import config
from app.core.config import Env
from app.dependencies.security import get_request_user
from app.dtos.auth import (
    GoogleLoginRequest,
    GoogleRegistrationRequest,
    LoginRequest,
    LoginResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    SignUpAvailabilityRequest,
    SignUpRequest,
    TokenRefreshResponse,
)
from app.models.users import User
from app.services.auth import AuthService
from app.services.jwt import JwtService
from app.services.security_audit import SecurityAuditEvent, log_security_event, mask_email, safe_summary

auth_router = APIRouter(prefix="/auth", tags=["auth"])


def set_refresh_token_cookie(resp: JSONResponse, refresh_token: str, remember_me: bool) -> None:
    cookie_options = {
        "key": "refresh_token",
        "value": refresh_token,
        "httponly": True,
        "secure": config.ENV == Env.PROD,
        "domain": config.COOKIE_DOMAIN or None,
        "samesite": "lax",
        "path": "/",
    }
    if remember_me:
        cookie_options["max_age"] = config.REFRESH_TOKEN_EXPIRE_MINUTES * 60

    resp.set_cookie(**cookie_options)


@auth_router.post("/signup-availability", status_code=status.HTTP_204_NO_CONTENT)
async def check_signup_availability(
    request: SignUpAvailabilityRequest,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    await auth_service.check_signup_availability(request)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@auth_router.get("/email-availability", status_code=status.HTTP_204_NO_CONTENT)
async def check_email_availability(
    email: str,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    await auth_service.check_email_exists(email)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@auth_router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    request: SignUpRequest,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    await auth_service.signup(request)
    return JSONResponse(
        content={"detail": "회원가입이 성공적으로 완료되었습니다."}, status_code=status.HTTP_201_CREATED
    )


@auth_router.post("/registrations", status_code=status.HTTP_201_CREATED)
async def register(
    request: SignUpRequest,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    return await signup(request, auth_service)


@auth_router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(
    request: LoginRequest,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    client_ip = http_request.client.host if http_request.client else "unknown"
    try:
        user = await auth_service.authenticate(request, client_ip=client_ip)
    except HTTPException as exc:
        event = (
            SecurityAuditEvent.LOGIN_RATE_LIMITED
            if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS
            else SecurityAuditEvent.LOGIN_FAILED
        )
        await log_security_event(
            event_type=event,
            request=http_request,
            status_code=exc.status_code,
            masked_summary=safe_summary({"email": mask_email(str(request.email)), "reason": exc.status_code}),
        )
        raise
    tokens = await auth_service.login(user)
    await log_security_event(
        event_type=SecurityAuditEvent.LOGIN_SUCCESS,
        request=http_request,
        user_id=user.id,
        status_code=status.HTTP_200_OK,
        masked_summary=safe_summary({"email": mask_email(user.email)}),
    )
    resp = JSONResponse(
        content=LoginResponse(access_token=str(tokens["access_token"])).model_dump(), status_code=status.HTTP_200_OK
    )
    set_refresh_token_cookie(resp, str(tokens["refresh_token"]), request.remember_me)
    return resp


@auth_router.post("/sessions", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def create_session(
    request: LoginRequest,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    return await login(request, http_request, auth_service)


@auth_router.post("/google-login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def google_login(
    request: GoogleLoginRequest,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    try:
        user = await auth_service.authenticate_google(request.id_token)
    except HTTPException as exc:
        await log_security_event(
            event_type=SecurityAuditEvent.GOOGLE_LOGIN_FAILED,
            request=http_request,
            status_code=exc.status_code,
            masked_summary=safe_summary({"reason": exc.status_code}),
        )
        raise
    tokens = await auth_service.login(user)
    await log_security_event(
        event_type=SecurityAuditEvent.GOOGLE_LOGIN_SUCCESS,
        request=http_request,
        user_id=user.id,
        status_code=status.HTTP_200_OK,
        masked_summary=safe_summary({"email": mask_email(user.email)}),
    )
    resp = JSONResponse(
        content=LoginResponse(access_token=str(tokens["access_token"])).model_dump(), status_code=status.HTTP_200_OK
    )
    set_refresh_token_cookie(resp, str(tokens["refresh_token"]), request.remember_me)
    return resp


@auth_router.post("/oauth-sessions/google", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def create_google_session(
    request: GoogleLoginRequest,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    return await google_login(request, http_request, auth_service)


@auth_router.post("/google-registrations", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def google_registration(
    request: GoogleRegistrationRequest,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    user = await auth_service.signup_google(request)
    tokens = await auth_service.login(user)
    await log_security_event(
        event_type=SecurityAuditEvent.GOOGLE_LOGIN_SUCCESS,
        request=http_request,
        user_id=user.id,
        status_code=status.HTTP_201_CREATED,
        masked_summary=safe_summary({"email": mask_email(user.email), "registration": True}),
    )
    resp = JSONResponse(
        content=LoginResponse(access_token=str(tokens["access_token"])).model_dump(),
        status_code=status.HTTP_201_CREATED,
    )
    set_refresh_token_cookie(resp, str(tokens["refresh_token"]), request.remember_me)
    return resp


@auth_router.post("/sessions/current", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_session_alias(http_request: Request) -> Response:
    return await logout(http_request)


@auth_router.delete("/sessions/current", status_code=status.HTTP_204_NO_CONTENT)
async def logout(http_request: Request) -> Response:
    await log_security_event(
        event_type=SecurityAuditEvent.LOGOUT,
        request=http_request,
        status_code=status.HTTP_204_NO_CONTENT,
    )
    resp = Response(status_code=status.HTTP_204_NO_CONTENT)
    resp.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=config.ENV == Env.PROD,
        domain=config.COOKIE_DOMAIN or None,
        samesite="lax",
        path="/",
    )
    return resp


@auth_router.get("/email-verifications", status_code=status.HTTP_200_OK)
async def verify_email(
    token: str,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> JSONResponse:
    await auth_service.verify_email(token)
    await log_security_event(
        event_type=SecurityAuditEvent.EMAIL_VERIFIED,
        request=http_request,
        status_code=status.HTTP_200_OK,
    )
    return JSONResponse(content={"data": {"verified": True}}, status_code=status.HTTP_200_OK)


@auth_router.post("/email-verification-requests", status_code=status.HTTP_204_NO_CONTENT)
async def request_email_verification(
    user: Annotated[User, Depends(get_request_user)],
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    await auth_service.request_email_verification(user)
    await log_security_event(
        event_type=SecurityAuditEvent.EMAIL_VERIFICATION_REQUESTED,
        request=http_request,
        user_id=user.id,
        status_code=status.HTTP_204_NO_CONTENT,
        masked_summary=safe_summary({"email": mask_email(user.email)}),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@auth_router.post("/password-reset-requests", status_code=status.HTTP_204_NO_CONTENT)
async def request_password_reset(
    request: PasswordResetRequest,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    await auth_service.request_password_reset(request.email)
    await log_security_event(
        event_type=SecurityAuditEvent.PASSWORD_RESET_REQUESTED,
        request=http_request,
        status_code=status.HTTP_204_NO_CONTENT,
        masked_summary=safe_summary({"email": mask_email(str(request.email))}),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@auth_router.post("/password-resets", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    request: PasswordResetConfirmRequest,
    http_request: Request,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    await auth_service.reset_password(token=request.token, new_password=request.new_password)
    await log_security_event(
        event_type=SecurityAuditEvent.PASSWORD_RESET_COMPLETED,
        request=http_request,
        status_code=status.HTTP_204_NO_CONTENT,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@auth_router.get("/token/refresh", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
async def token_refresh(
    jwt_service: Annotated[JwtService, Depends(JwtService)],
    http_request: Request,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> JSONResponse:
    if not refresh_token:
        await log_security_event(
            event_type=SecurityAuditEvent.UNAUTHORIZED_ACCESS,
            request=http_request,
            status_code=status.HTTP_401_UNAUTHORIZED,
            masked_summary=safe_summary({"reason": "missing_refresh_token"}),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is missing.")
    try:
        access_token = jwt_service.refresh_jwt(refresh_token)
    except HTTPException as exc:
        await log_security_event(
            event_type=SecurityAuditEvent.UNAUTHORIZED_ACCESS,
            request=http_request,
            status_code=exc.status_code,
            masked_summary=safe_summary({"reason": "invalid_refresh_token"}),
        )
        raise
    await log_security_event(
        event_type=SecurityAuditEvent.TOKEN_REFRESH,
        request=http_request,
        user_id=access_token.payload.get("user_id"),
        status_code=status.HTTP_200_OK,
    )
    return JSONResponse(
        content=TokenRefreshResponse(access_token=str(access_token)).model_dump(), status_code=status.HTTP_200_OK
    )


@auth_router.post("/access-tokens", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
async def create_access_token(
    jwt_service: Annotated[JwtService, Depends(JwtService)],
    http_request: Request,
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> JSONResponse:
    return await token_refresh(jwt_service, http_request, refresh_token)
