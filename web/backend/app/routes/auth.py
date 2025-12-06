"""Auth routes - GitHub OAuth flow."""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
import httpx

from app.config import settings
from app.database import get_db
from app.models import Installation
from app.schemas import OAuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
async def login():
    """Get GitHub OAuth URL."""
    params = f"client_id={settings.github_app_client_id}&redirect_uri={settings.frontend_url}/setup/callback&scope=read:user"
    return {"url": f"https://github.com/login/oauth/authorize?{params}"}


@router.get("/callback", response_model=OAuthResponse)
async def callback(code: str = Query(...), db: Session = Depends(get_db)):
    """Handle OAuth callback."""
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        r = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_app_client_id,
                "client_secret": settings.github_app_client_secret,
                "code": code,
            },
        )
        if r.status_code != 200 or "error" in r.json():
            raise HTTPException(400, "OAuth failed")

        token = r.json()["access_token"]

        # Get user info
        user = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        user_data = user.json()

        # Get installations
        installs = await client.get(
            "https://api.github.com/user/installations",
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        installations = (
            installs.json().get("installations", [])
            if installs.status_code == 200
            else []
        )

    return OAuthResponse(
        github_id=user_data["id"],
        github_username=user_data["login"],
        avatar_url=user_data.get("avatar_url"),
        access_token=token,
        installations=[
            {"id": i["id"], "account_login": i["account"]["login"]}
            for i in installations
        ],
    )


@router.get("/install-url")
async def install_url():
    """Get GitHub App install URL."""
    # GitHub will redirect to the Setup URL configured in the App settings
    # with ?installation_id=xxx&setup_action=install
    return {"url": "https://github.com/apps/trainforge/installations/new"}


@router.get("/installations")
async def get_installations(token: str = Query(...)):
    """Refresh user's installations list."""
    async with httpx.AsyncClient() as client:
        installs = await client.get(
            "https://api.github.com/user/installations",
            headers={
                "Authorization": f"token {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        if installs.status_code != 200:
            raise HTTPException(400, "Failed to fetch installations")

        installations = installs.json().get("installations", [])
        return {
            "installations": [
                {"id": i["id"], "account_login": i["account"]["login"]}
                for i in installations
            ]
        }


@router.post("/installations")
async def register(
    installation_id: int,
    github_user_id: int,
    github_username: str,
    db: Session = Depends(get_db),
):
    """Register installation."""
    existing = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id)
        .first()
    )
    if existing:
        existing.is_active = True
        db.commit()
        return {"id": existing.id}

    inst = Installation(
        installation_id=installation_id,
        github_user_id=github_user_id,
        github_username=github_username,
    )
    db.add(inst)
    db.commit()
    return {"id": inst.id}
