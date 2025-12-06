from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


# Auth
class OAuthResponse(BaseModel):
    github_id: int
    github_username: str
    avatar_url: Optional[str] = None
    access_token: str
    installations: List[Dict[str, Any]]


# Repository
class RepoResponse(BaseModel):
    id: int
    github_repo_id: int
    owner: str
    name: str
    full_name: str
    default_branch: str
    has_workflow: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Training Run
class TriggerRequest(BaseModel):
    template: str = "cpu-small"
    run_command: str = "python train.py"
    requirements_file: str = "requirements.txt"
    max_runtime_hours: int = 2
    artifacts_path: str = "results/"


class TriggerResponse(BaseModel):
    success: bool
    message: str


class RunResponse(BaseModel):
    id: int
    github_run_id: int
    github_run_url: Optional[str]
    template: Optional[str]
    status: str
    conclusion: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# Templates
class Template(BaseModel):
    id: str
    name: str
    instance_type: str
    gpu: Optional[str]
    vcpu: int
    ram_gb: int
    storage_gb: int
    cost_per_hour: float
    description: str


TEMPLATES = [
    Template(
        id="cpu-small",
        name="CPU Small",
        instance_type="t3.medium",
        gpu=None,
        vcpu=2,
        ram_gb=4,
        storage_gb=50,
        cost_per_hour=0.042,
        description="Good for small experiments and data preprocessing",
    ),
    Template(
        id="cpu-large",
        name="CPU Large",
        instance_type="c6i.4xlarge",
        gpu=None,
        vcpu=16,
        ram_gb=32,
        storage_gb=100,
        cost_per_hour=0.68,
        description="Good for CPU-intensive training and larger datasets",
    ),
    Template(
        id="gpu-t4",
        name="GPU T4",
        instance_type="g4dn.xlarge",
        gpu="NVIDIA T4 (16GB)",
        vcpu=4,
        ram_gb=16,
        storage_gb=125,
        cost_per_hour=0.526,
        description="Great for most deep learning workloads",
    ),
    Template(
        id="gpu-a10",
        name="GPU A10",
        instance_type="g5.xlarge",
        gpu="NVIDIA A10G (24GB)",
        vcpu=4,
        ram_gb=16,
        storage_gb=250,
        cost_per_hour=1.006,
        description="For large models and high-performance training",
    ),
]
