"""GitHub API client - simplified."""

import jwt
import time
import base64
import httpx
from typing import Dict, Any, List
from app.config import settings

API_URL = "https://api.github.com"
HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def _jwt() -> str:
    """Generate JWT for GitHub App auth."""
    return jwt.encode(
        {
            "iat": int(time.time()) - 60,
            "exp": int(time.time()) + 600,
            "iss": settings.github_app_id,
        },
        settings.github_app_private_key,
        algorithm="RS256",
    )


async def _get_token(installation_id: int) -> str:
    """Get installation access token."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{API_URL}/app/installations/{installation_id}/access_tokens",
            headers={**HEADERS, "Authorization": f"Bearer {_jwt()}"},
        )
        r.raise_for_status()
        return r.json()["token"]


async def _request(
    method: str, url: str, installation_id: int, **kwargs
) -> httpx.Response:
    """Make authenticated GitHub API request."""
    token = await _get_token(installation_id)
    async with httpx.AsyncClient() as client:
        return await getattr(client, method)(
            url, headers={**HEADERS, "Authorization": f"token {token}"}, **kwargs
        )


# Public API
async def get_repos(installation_id: int) -> List[Dict[str, Any]]:
    """Get repos for installation."""
    r = await _request("get", f"{API_URL}/installation/repositories", installation_id)
    r.raise_for_status()
    return r.json().get("repositories", [])


async def check_workflow(installation_id: int, owner: str, repo: str) -> bool:
    """Check if trainforge workflow exists."""
    r = await _request(
        "get",
        f"{API_URL}/repos/{owner}/{repo}/contents/.github/workflows/trainforge.yml",
        installation_id,
    )
    return r.status_code == 200


async def get_workflow_file(
    installation_id: int, owner: str, repo: str
) -> Dict[str, Any] | None:
    """Get workflow file details including SHA (needed for updates)."""
    r = await _request(
        "get",
        f"{API_URL}/repos/{owner}/{repo}/contents/.github/workflows/trainforge.yml",
        installation_id,
    )
    if r.status_code == 200:
        return r.json()
    return None


async def create_workflow(
    installation_id: int, owner: str, repo: str, content: str, branch: str = "main"
):
    """Create trainforge workflow file."""
    r = await _request(
        "put",
        f"{API_URL}/repos/{owner}/{repo}/contents/.github/workflows/trainforge.yml",
        installation_id,
        json={
            "message": "Add TrainForge workflow",
            "content": base64.b64encode(content.encode()).decode(),
            "branch": branch,
        },
    )
    r.raise_for_status()
    return r.json()


async def update_workflow(
    installation_id: int,
    owner: str,
    repo: str,
    content: str,
    sha: str,
    branch: str = "main",
):
    """Update existing trainforge workflow file."""
    r = await _request(
        "put",
        f"{API_URL}/repos/{owner}/{repo}/contents/.github/workflows/trainforge.yml",
        installation_id,
        json={
            "message": "Update TrainForge workflow",
            "content": base64.b64encode(content.encode()).decode(),
            "sha": sha,  # Required for updating existing files
            "branch": branch,
        },
    )
    r.raise_for_status()
    return r.json()


async def trigger_workflow(
    installation_id: int,
    owner: str,
    repo: str,
    inputs: Dict[str, str],
    ref: str = "main",
) -> tuple[bool, str]:
    """Trigger workflow dispatch. Returns (success, error_message)."""
    try:
        r = await _request(
            "post",
            f"{API_URL}/repos/{owner}/{repo}/actions/workflows/trainforge.yml/dispatches",
            installation_id,
            json={"ref": ref, "inputs": inputs},
        )
        if r.status_code == 204:
            return True, ""
        else:
            error_detail = r.text if r.text else f"HTTP {r.status_code}"
            return False, f"GitHub API error: {error_detail}"
    except Exception as e:
        return False, str(e)


async def get_runs(
    installation_id: int, owner: str, repo: str, limit: int = 10
) -> List[Dict[str, Any]]:
    """Get workflow runs."""
    r = await _request(
        "get",
        f"{API_URL}/repos/{owner}/{repo}/actions/workflows/trainforge.yml/runs",
        installation_id,
        params={"per_page": limit},
    )
    r.raise_for_status()
    return r.json().get("workflow_runs", [])


async def get_run(
    installation_id: int, owner: str, repo: str, run_id: int
) -> Dict[str, Any]:
    """Get single workflow run."""
    r = await _request(
        "get", f"{API_URL}/repos/{owner}/{repo}/actions/runs/{run_id}", installation_id
    )
    r.raise_for_status()
    return r.json()


async def cancel_run(installation_id: int, owner: str, repo: str, run_id: int) -> bool:
    """Cancel a workflow run."""
    r = await _request(
        "post",
        f"{API_URL}/repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
        installation_id,
    )
    return r.status_code == 202


async def get_run_artifacts(
    installation_id: int, owner: str, repo: str, run_id: int
) -> List[Dict[str, Any]]:
    """Get artifacts for a workflow run."""
    r = await _request(
        "get",
        f"{API_URL}/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
        installation_id,
    )
    r.raise_for_status()
    return r.json().get("artifacts", [])


async def get_artifact_download_url(
    installation_id: int, owner: str, repo: str, artifact_id: int
) -> str | None:
    """Get download URL for an artifact. Returns the redirect URL."""
    token = await _get_token(installation_id)
    async with httpx.AsyncClient(follow_redirects=False) as client:
        r = await client.get(
            f"{API_URL}/repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip",
            headers={**HEADERS, "Authorization": f"token {token}"},
        )
        if r.status_code == 302:
            return r.headers.get("location")
    return None
