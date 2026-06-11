from httpx import ASGITransport, AsyncClient
from starlette import status
from tortoise.contrib.test import TestCase

from app.main import app


def _extract_refresh_token(set_cookie: str | None) -> str:
    if not set_cookie:
        return ""
    import re

    match = re.search(r"refresh_token=([^;]+)", set_cookie)
    return match.group(1) if match else ""


class TestJWTTokenRefreshAPI(TestCase):
    async def test_token_refresh_success(self):
        # 사용자 등록 및 로그인하여 리프레시 토큰 획득
        signup_data = {
            "email": "refresh@example.com",
            "password": "Password123!",
            "name": "리프레시테스터",
            "gender": "MALE",
            "birth_date": "1990-01-01",
            "phone_number": "01099998888",
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/v1/auth/signup", json=signup_data)

            login_response = await client.post(
                "/api/v1/auth/login", json={"email": "refresh@example.com", "password": "Password123!"}
            )

            # 쿠키에서 refresh_token 추출
            refresh_token = _extract_refresh_token(login_response.headers.get("set-cookie"))

            # 토큰 갱신 시도
            client.cookies["refresh_token"] = refresh_token
            response = await client.get("/api/v1/auth/token/refresh")
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()
        assert _extract_refresh_token(response.headers.get("set-cookie"))
        assert _extract_refresh_token(response.headers.get("set-cookie")) != refresh_token

    async def test_token_refresh_rejects_reused_refresh_token(self):
        signup_data = {
            "email": "reuse@example.com",
            "password": "Password123!",
            "name": "재사용테스터",
            "gender": "MALE",
            "birth_date": "1990-01-01",
            "phone_number": "01099997777",
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            await client.post("/api/v1/auth/signup", json=signup_data)
            login_response = await client.post(
                "/api/v1/auth/login", json={"email": "reuse@example.com", "password": "Password123!"}
            )
            old_refresh_token = _extract_refresh_token(login_response.headers.get("set-cookie"))

            client.cookies["refresh_token"] = old_refresh_token
            first_refresh = await client.get("/api/v1/auth/token/refresh")

            client.cookies["refresh_token"] = old_refresh_token
            reused_refresh = await client.get("/api/v1/auth/token/refresh")

        assert first_refresh.status_code == status.HTTP_200_OK
        assert reused_refresh.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_token_refresh_missing_token(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/auth/token/refresh")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Refresh token is missing."
