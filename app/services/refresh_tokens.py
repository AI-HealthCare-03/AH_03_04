from datetime import datetime

from fastapi import HTTPException, status
from tortoise.transactions import in_transaction

from app.core import config
from app.core.jwt.tokens import AccessToken, RefreshToken
from app.models.security import RefreshTokenSession
from app.services.jwt import JwtService


class RefreshTokenSessionService:
    def __init__(self):
        self.jwt_service = JwtService()

    async def create_session(self, user_id: int, refresh_token: RefreshToken, remember_me: bool) -> RefreshTokenSession:
        return await RefreshTokenSession.create(
            user_id=user_id,
            jti=self._jti(refresh_token),
            expires_at=self._expires_at(refresh_token),
            remember_me=remember_me,
        )

    async def rotate(self, refresh_token: str) -> tuple[AccessToken, RefreshToken, bool]:
        verified = self.jwt_service.verify_jwt(token=refresh_token, token_type="refresh")
        old_jti = self._jti(verified)
        session = await RefreshTokenSession.get_or_none(jti=old_jti).prefetch_related("user")
        if session is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is invalid.")

        now = datetime.now(config.TIMEZONE)
        if session.revoked_at is not None:
            await self._mark_reuse_and_revoke_user_sessions(session, now)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reuse detected.")

        if session.expires_at < now:
            session.revoked_at = now
            await session.save(update_fields=["revoked_at"])
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired.")

        user = session.user
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="비활성화된 계정입니다.")

        tokens = self.jwt_service.issue_jwt_pair(user)
        new_refresh_token = tokens["refresh_token"]

        async with in_transaction():
            session.revoked_at = now
            session.replaced_by_jti = self._jti(new_refresh_token)
            await session.save(update_fields=["revoked_at", "replaced_by_jti"])
            await self.create_session(
                user_id=user.id,
                refresh_token=new_refresh_token,
                remember_me=session.remember_me,
            )

        return tokens["access_token"], new_refresh_token, session.remember_me

    async def revoke(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            verified = self.jwt_service.verify_jwt(token=refresh_token, token_type="refresh")
        except HTTPException:
            return
        session = await RefreshTokenSession.get_or_none(jti=self._jti(verified), revoked_at=None)
        if session is None:
            return
        session.revoked_at = datetime.now(config.TIMEZONE)
        await session.save(update_fields=["revoked_at"])

    async def revoke_all_for_user(self, user_id: int) -> None:
        await RefreshTokenSession.filter(user_id=user_id, revoked_at=None).update(
            revoked_at=datetime.now(config.TIMEZONE)
        )

    async def _mark_reuse_and_revoke_user_sessions(self, session: RefreshTokenSession, now: datetime) -> None:
        if session.reuse_detected_at is None:
            session.reuse_detected_at = now
            await session.save(update_fields=["reuse_detected_at"])
        await RefreshTokenSession.filter(user_id=session.user_id, revoked_at=None).update(revoked_at=now)

    @staticmethod
    def _jti(refresh_token: RefreshToken) -> str:
        return str(refresh_token.payload["jti"])

    @staticmethod
    def _expires_at(refresh_token: RefreshToken) -> datetime:
        return datetime.fromtimestamp(int(refresh_token.payload["exp"]), tz=config.TIMEZONE)
