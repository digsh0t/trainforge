"""Workflow routes - trigger and list training runs."""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Installation, Repository, TrainingRun
from app.schemas import (
    TriggerRequest,
    TriggerResponse,
    RunResponse,
    Template,
    TEMPLATES,
)
from app import github

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/templates")
async def list_templates() -> dict:
    """Get available templates."""
    return {"templates": TEMPLATES}


@router.get("/templates/{template_id}", response_model=Template)
async def get_template(template_id: str):
    """Get template by ID."""
    for t in TEMPLATES:
        if t.id == template_id:
            return t
    raise HTTPException(404, "Template not found")


@router.post(
    "/{installation_id}/{owner}/{repo}/trigger", response_model=TriggerResponse
)
async def trigger(
    installation_id: int,
    owner: str,
    repo: str,
    req: TriggerRequest,
    ref: str = Query("main"),
    db: Session = Depends(get_db),
):
    """Trigger training run."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id, Installation.is_active)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Installation not found")

    db_repo = (
        db.query(Repository)
        .filter(Repository.owner == owner, Repository.name == repo)
        .first()
    )
    if not db_repo or not db_repo.has_workflow:
        raise HTTPException(400, "Workflow not set up")

    if not any(t.id == req.template for t in TEMPLATES):
        raise HTTPException(400, "Invalid template")

    inputs = {
        "template": req.template,
        "run_command": req.run_command,
        "requirements_file": req.requirements_file,
        "max_runtime_hours": str(req.max_runtime_hours),
        "artifacts_path": req.artifacts_path,
    }

    success, error_msg = await github.trigger_workflow(
        installation_id, owner, repo, inputs, ref
    )
    if success:
        # Try to get the newly created run to save template immediately
        import asyncio

        await asyncio.sleep(2)  # Wait a bit for GitHub to create the run

        try:
            gh_runs = await github.get_runs(installation_id, owner, repo, limit=1)
            if gh_runs:
                latest_run = gh_runs[0]
                # Check if this run doesn't exist in DB yet
                existing = (
                    db.query(TrainingRun)
                    .filter(TrainingRun.github_run_id == latest_run["id"])
                    .first()
                )
                if not existing:
                    new_run = TrainingRun(
                        repository_id=db_repo.id,
                        github_run_id=latest_run["id"],
                        github_run_url=latest_run.get("html_url"),
                        template=req.template,  # Save the template we know!
                        status=latest_run["status"],
                        conclusion=latest_run.get("conclusion"),
                    )
                    db.add(new_run)
                    db.commit()
                    return TriggerResponse(
                        success=True,
                        message="Workflow triggered",
                        run_url=latest_run.get("html_url"),
                    )
        except Exception:
            pass  # If we can't get the run, still return success

        return TriggerResponse(success=True, message="Workflow triggered")
    return TriggerResponse(
        success=False, message=error_msg or "Failed to trigger workflow"
    )


@router.get("/{installation_id}/{owner}/{repo}/runs", response_model=List[RunResponse])
async def list_runs(
    installation_id: int,
    owner: str,
    repo: str,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List workflow runs."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id, Installation.is_active)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Installation not found")

    db_repo = (
        db.query(Repository)
        .filter(Repository.owner == owner, Repository.name == repo)
        .first()
    )
    if not db_repo:
        raise HTTPException(404, "Repository not found")

    gh_runs = await github.get_runs(installation_id, owner, repo, limit)
    result = []

    for r in gh_runs:
        run = db.query(TrainingRun).filter(TrainingRun.github_run_id == r["id"]).first()

        # Try to extract template from inputs or display_title
        template = None
        if r.get("inputs"):
            template = r["inputs"].get("template")
        elif r.get("display_title"):
            # display_title format is usually "TrainForge ML Training" or includes template
            # Check if any known template ID is in the title
            display_title = r.get("display_title", "")
            for t in TEMPLATES:
                if t.id in display_title:
                    template = t.id
                    break

        if not run:
            run = TrainingRun(
                repository_id=db_repo.id,
                github_run_id=r["id"],
                github_run_url=r.get("html_url"),
                template=template,
                status=r["status"],
                conclusion=r.get("conclusion"),
            )
            db.add(run)
        else:
            run.status = r["status"]
            run.conclusion = r.get("conclusion")
            # Update template if we found one and it was previously null
            if template and not run.template:
                run.template = template

        db.commit()
        db.refresh(run)
        result.append(run)

    return result


@router.get("/{installation_id}/{owner}/{repo}/runs/{run_id}")
async def get_run(installation_id: int, owner: str, repo: str, run_id: int):
    """Get single run."""
    return await github.get_run(installation_id, owner, repo, run_id)


@router.post("/{installation_id}/{owner}/{repo}/runs/{run_id}/cancel")
async def cancel_run(
    installation_id: int,
    owner: str,
    repo: str,
    run_id: int,
    db: Session = Depends(get_db),
):
    """Cancel a running workflow."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id, Installation.is_active)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Installation not found")

    success = await github.cancel_run(installation_id, owner, repo, run_id)
    if success:
        return {"success": True, "message": "Run cancelled"}
    raise HTTPException(400, "Failed to cancel run")


@router.get("/{installation_id}/{owner}/{repo}/runs/{run_id}/artifacts")
async def list_artifacts(
    installation_id: int,
    owner: str,
    repo: str,
    run_id: int,
    db: Session = Depends(get_db),
):
    """List artifacts for a workflow run."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id, Installation.is_active)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Installation not found")

    artifacts = await github.get_run_artifacts(installation_id, owner, repo, run_id)
    return {"artifacts": artifacts}


@router.get("/{installation_id}/{owner}/{repo}/artifacts/{artifact_id}/download")
async def get_artifact_download(
    installation_id: int,
    owner: str,
    repo: str,
    artifact_id: int,
    db: Session = Depends(get_db),
):
    """Get download URL for an artifact."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id, Installation.is_active)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Installation not found")

    url = await github.get_artifact_download_url(
        installation_id, owner, repo, artifact_id
    )
    if url:
        return {"download_url": url}
    raise HTTPException(404, "Artifact not found or expired")
