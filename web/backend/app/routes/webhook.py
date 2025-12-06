"""Webhook routes for GitHub events."""

from fastapi import APIRouter, Request, Header, Depends
from sqlalchemy.orm import Session
import hmac
import hashlib

from app.config import settings
from app.database import get_db
from app.models import Installation, Repository, TrainingRun

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def verify_sig(payload: bytes, signature: str) -> bool:
    if not settings.github_webhook_secret or not signature:
        return True
    expected = (
        "sha256="
        + hmac.new(
            settings.github_webhook_secret.encode(), payload, hashlib.sha256
        ).hexdigest()
    )
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def webhook(
    request: Request,
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None),
    db: Session = Depends(get_db),
):
    """Handle GitHub webhooks."""
    payload = await request.body()
    if not verify_sig(payload, x_hub_signature_256 or ""):
        return {"error": "Invalid signature"}

    data = await request.json()

    if x_github_event == "ping":
        return {"status": "pong"}

    if x_github_event == "installation":
        return handle_installation(data, db)

    if x_github_event == "workflow_run":
        return handle_workflow_run(data, db)

    return {"status": "ignored"}


def handle_installation(data: dict, db: Session):
    action = data.get("action")
    inst_id = data.get("installation", {}).get("id")
    sender = data.get("sender", {})

    if action == "created":
        existing = (
            db.query(Installation)
            .filter(Installation.installation_id == inst_id)
            .first()
        )
        if existing:
            existing.is_active = True
        else:
            db.add(
                Installation(
                    installation_id=inst_id,
                    github_user_id=sender.get("id", 0),
                    github_username=sender.get("login", ""),
                )
            )
        db.commit()
        return {"status": "created"}

    if action in ("deleted", "suspend"):
        inst = (
            db.query(Installation)
            .filter(Installation.installation_id == inst_id)
            .first()
        )
        if inst:
            inst.is_active = False
            db.commit()
        return {"status": action}

    return {"status": "ignored"}


def handle_workflow_run(data: dict, db: Session):
    run = data.get("workflow_run", {})
    if run.get("name") != "TrainForge ML Training":
        return {"status": "ignored"}

    repo_data = data.get("repository", {})
    db_repo = (
        db.query(Repository)
        .filter(Repository.github_repo_id == repo_data.get("id"))
        .first()
    )
    if not db_repo:
        return {"status": "repo_not_found"}

    db_run = (
        db.query(TrainingRun).filter(TrainingRun.github_run_id == run["id"]).first()
    )
    if not db_run:
        db_run = TrainingRun(
            repository_id=db_repo.id,
            github_run_id=run["id"],
            github_run_url=run.get("html_url"),
        )
        db.add(db_run)

    db_run.status = run.get("status", "queued")
    db_run.conclusion = run.get("conclusion")

    if data.get("action") == "in_progress":
        from datetime import datetime

        db_run.started_at = datetime.utcnow()
    elif data.get("action") == "completed":
        from datetime import datetime

        db_run.completed_at = datetime.utcnow()

    db.commit()
    return {"status": "updated", "run_id": run["id"]}
