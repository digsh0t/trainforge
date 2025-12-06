"""Repository routes."""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Installation, Repository
from app.schemas import RepoResponse
from app import github

router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("/{installation_id}", response_model=List[RepoResponse])
async def list_repos(
    installation_id: int,
    db: Session = Depends(get_db),
    github_user_id: Optional[int] = Query(None),
    github_username: Optional[str] = Query(None),
):
    """List repos for installation."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id)
        .first()
    )

    # Auto-create installation if it doesn't exist
    if not inst:
        if not github_user_id or not github_username:
            raise HTTPException(
                404,
                "Installation not found. Provide github_user_id and github_username to register.",
            )
        now = datetime.utcnow()
        inst = Installation(
            installation_id=installation_id,
            github_user_id=github_user_id,
            github_username=github_username,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(inst)
        db.commit()
        db.refresh(inst)
    elif not inst.is_active:
        inst.is_active = True
        db.commit()

    gh_repos = await github.get_repos(installation_id)
    result = []

    for r in gh_repos:
        repo = db.query(Repository).filter(Repository.github_repo_id == r["id"]).first()
        if not repo:
            repo = Repository(
                github_repo_id=r["id"],
                installation_id=inst.id,
                owner=r["owner"]["login"],
                name=r["name"],
                full_name=r["full_name"],
                default_branch=r.get("default_branch", "main"),
            )
            db.add(repo)
            db.commit()
            db.refresh(repo)

        # Check workflow status
        has_workflow = await github.check_workflow(
            installation_id, r["owner"]["login"], r["name"]
        )
        if has_workflow != repo.has_workflow:
            repo.has_workflow = has_workflow
            db.commit()

        result.append(repo)

    return result


@router.post("/{installation_id}/{owner}/{repo}/setup-workflow")
async def setup_workflow(
    installation_id: int, owner: str, repo: str, db: Session = Depends(get_db)
):
    """Add trainforge workflow to repo."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id, Installation.is_active)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Installation not found")

    if await github.check_workflow(installation_id, owner, repo):
        raise HTTPException(400, "Workflow already exists")

    workflow = WORKFLOW_TEMPLATE
    result = await github.create_workflow(installation_id, owner, repo, workflow)

    # Update DB
    db_repo = (
        db.query(Repository)
        .filter(Repository.owner == owner, Repository.name == repo)
        .first()
    )
    if db_repo:
        db_repo.has_workflow = True
        db.commit()

    return {"success": True, "url": result.get("content", {}).get("html_url")}


@router.put("/{installation_id}/{owner}/{repo}/update-workflow")
async def update_workflow(
    installation_id: int, owner: str, repo: str, db: Session = Depends(get_db)
):
    """Update existing trainforge workflow in repo."""
    inst = (
        db.query(Installation)
        .filter(Installation.installation_id == installation_id, Installation.is_active)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Installation not found")

    # Get existing workflow file to get SHA
    existing = await github.get_workflow_file(installation_id, owner, repo)
    if not existing:
        raise HTTPException(
            404, "Workflow does not exist - use setup-workflow to create it"
        )

    workflow = WORKFLOW_TEMPLATE
    result = await github.update_workflow(
        installation_id, owner, repo, workflow, existing["sha"]
    )

    return {"success": True, "url": result.get("content", {}).get("html_url")}


WORKFLOW_TEMPLATE = """name: TrainForge ML Training

on:
  workflow_dispatch:
    inputs:
      template:
        description: 'Instance template'
        required: true
        default: 'cpu-small'
        type: choice
        options: [cpu-small, cpu-large, gpu-t4, gpu-a10]
      run_command:
        description: 'Command to run training'
        required: true
        default: 'python train.py'
      requirements_file:
        description: 'Requirements file'
        default: 'requirements.txt'
      max_runtime_hours:
        description: 'Max runtime (hours)'
        default: '2'
      artifacts_path:
        description: 'Paths to save as artifacts (comma-separated)'
        default: 'results/'

env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_REGION: ${{ vars.AWS_REGION || 'us-east-1' }}

jobs:
  train:
    runs-on: ubuntu-latest
    outputs:
      instance_ip: ${{ steps.provision.outputs.instance_ip }}
      bucket_name: ${{ steps.provision.outputs.bucket_name }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false
      
      - name: Configure instance type
        id: config
        run: |
          case "${{ inputs.template }}" in
            cpu-small)  echo "instance_type=t3.medium" >> $GITHUB_OUTPUT ;;
            cpu-large)  echo "instance_type=t3.xlarge" >> $GITHUB_OUTPUT ;;
            gpu-t4)     echo "instance_type=g4dn.xlarge" >> $GITHUB_OUTPUT ;;
            gpu-a10)    echo "instance_type=g5.xlarge" >> $GITHUB_OUTPUT ;;
            *)          echo "instance_type=t3.medium" >> $GITHUB_OUTPUT ;;
          esac
      
      - name: Create Terraform config
        run: |
          mkdir -p train-infra
          cat > train-infra/main.tf << 'TFEOF'
          terraform {
            required_providers {
              aws = { source = "hashicorp/aws", version = "~> 5.0" }
            }
          }
          
          provider "aws" {
            region = var.aws_region
          }
          
          variable "aws_region" {}
          variable "instance_type" {}
          variable "repo_url" {}
          variable "run_command" {}
          variable "requirements_file" {}
          variable "run_id" {}
          
          module "training" {
            source = "github.com/digsh0t/terraform-aws-trainforge?ref=main"
            
            project_name      = "trainforge"
            environment       = "prod"
            instance_type     = var.instance_type
            repo_url          = var.repo_url
            run_command       = var.run_command
            requirements_file = var.requirements_file
            run_id            = var.run_id
          }
          
          output "instance_ip" { value = module.training.instance_public_ip }
          output "bucket_name" { value = module.training.bucket_name }
          output "artifacts_path" { value = module.training.artifacts_path }
          TFEOF
      
      - name: Provision infrastructure
        id: provision
        working-directory: train-infra
        run: |
          terraform init
          terraform apply -auto-approve \\
            -var="aws_region=${{ env.AWS_REGION }}" \\
            -var="instance_type=${{ steps.config.outputs.instance_type }}" \\
            -var="repo_url=https://github.com/${{ github.repository }}.git" \\
            -var="run_command=${{ inputs.run_command }}" \\
            -var="requirements_file=${{ inputs.requirements_file }}" \\
            -var="run_id=${{ github.run_id }}"
          
          echo "instance_ip=$(terraform output -raw instance_ip)" >> $GITHUB_OUTPUT
          echo "bucket_name=$(terraform output -raw bucket_name)" >> $GITHUB_OUTPUT
      
      - name: Wait for training completion
        run: |
          echo "Waiting for training to complete..."
          BUCKET="${{ steps.provision.outputs.bucket_name }}"
          RUN_ID="${{ github.run_id }}"
          TIMEOUT=$(( ${{ inputs.max_runtime_hours }} * 3600 ))
          ELAPSED=0
          
          while [ $ELAPSED -lt $TIMEOUT ]; do
            if aws s3 cp s3://$BUCKET/$RUN_ID/status /tmp/status 2>/dev/null; then
              echo "Training completed!"
              break
            fi
            echo "Training in progress... (${ELAPSED}s elapsed)"
            sleep 30
            ELAPSED=$((ELAPSED + 30))
          done
      
      - name: Download results
        run: |
          mkdir -p outputs
          aws s3 cp s3://${{ steps.provision.outputs.bucket_name }}/${{ github.run_id }}/ outputs/ --recursive || true
          ls -la outputs/
      
      - name: Cleanup infrastructure
        if: always()
        working-directory: train-infra
        run: |
          terraform destroy -auto-approve \\
            -var="aws_region=${{ env.AWS_REGION }}" \\
            -var="instance_type=${{ steps.config.outputs.instance_type }}" \\
            -var="repo_url=https://github.com/${{ github.repository }}.git" \\
            -var="run_command=${{ inputs.run_command }}" \\
            -var="requirements_file=${{ inputs.requirements_file }}" \\
            -var="run_id=${{ github.run_id }}"
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: training-outputs-${{ github.run_id }}
          path: |
            outputs/
            ${{ inputs.artifacts_path }}
"""
