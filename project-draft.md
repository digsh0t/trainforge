# Cloud-Based AI Training Cluster — Project Draft

## 1. Project Overview

This project implements a cloud-based AI training cluster capable of running containerized machine learning training jobs on dedicated CPU and GPU compute resources. The entire environment is provisioned through infrastructure-as-code, ensuring the setup is reproducible, consistent, and easily deployable. The cluster includes centralized experiment tracking, persistent artifact storage, monitoring visibility, and automated machine learning job execution.

**New in v2:** A self-service web platform ("TrainForge") allows users to select infrastructure templates, upload training code, and launch training jobs with one click.

---

## 2. Objectives

- Build a scalable training environment using cloud compute nodes.
- Enable GPU-accelerated machine learning model training.
- Establish automated provisioning for compute instances, networking, storage, and supporting services.
- Provide experiment tracking and results visualization.
- Implement monitoring and resource visibility across the cluster.
- **Create a user-friendly web interface for self-service ML training.**
- Make the entire system reproducible for local development, testing, and portfolio demonstration.

---

## 3. High-Level Architecture

- **Infrastructure Layer**: Provision cloud resources including compute nodes (CPU and GPU), networking, security roles, storage buckets, and service endpoints.
- **Training Environment**: Containerized machine learning tasks deployed to the compute nodes, capable of running small-to-medium-scale training workloads.
- **Experiment Tracking**: Central server for logging metrics, parameters, artifacts, and training results.
- **Storage**: Cloud object storage for datasets, model checkpoints, and logs.
- **Monitoring Stack**: Resource and job monitoring through a metrics and dashboarding system.
- **Web Platform**: Self-service interface for template selection, code upload, job submission, and monitoring.

---

## 4. Milestones and MVPs

### **Milestone 1: Core Infrastructure Setup** ✅

**MVP:** Provision the foundational cloud environment with infrastructure-as-code, including networking, security roles, storage bucket, and a single GPU-enabled compute instance. Confirm the instance can run a basic containerized ML script and access cloud storage.

**Status:** Complete - Terraform modules for VPC, IAM, S3, and EC2 (CPU/GPU) are implemented.

---

### **Milestone 2: Self-Service Web Platform (TrainForge)**

**MVP:** Build a web application that allows users to:

1. Connect their GitHub repository with one click (GitHub App)
2. Automatically set up the training workflow in their repo
3. Trigger training runs from the TrainForge dashboard
4. Monitor job status, view logs, and download results
5. Calculate estimated costs before running

#### 2.1 Architecture: GitHub App + GitHub Actions (Maximum Automation, Minimal Trust)

TrainForge uses a GitHub App to automate setup while keeping all compute on the user's infrastructure.

**Key Principles:**

- **Maximum automation**: One-click repo connection, automatic workflow setup
- **Minimal credentials**: We only get GitHub repo access, never AWS credentials
- **User's infrastructure**: All training runs on their GitHub Actions + AWS account
- **Junior-dev friendly**: Install app → Add AWS keys → Click "Train"

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TrainForge Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User clicks "Connect Repository" on TrainForge                   │
│     → Redirects to GitHub App installation                           │
│     → User selects repos to grant access                             │
│     → App permissions: Actions (write), Contents (write)             │
│                                                                      │
│  2. TrainForge automatically adds workflow file                      │
│     → Creates .github/workflows/trainforge.yml                       │
│     → User sees confirmation in dashboard                            │
│                                                                      │
│  3. User adds AWS credentials to GitHub Secrets                      │
│     → We provide direct link to repo secrets page                    │
│     → AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION           │
│     → We NEVER see these credentials                                 │
│                                                                      │
│  4. User clicks "Start Training" on TrainForge                       │
│     → Selects template (cpu-small, gpu-t4, etc.)                     │
│     → Configures training script and max runtime                     │
│     → We trigger workflow via GitHub API                             │
│                                                                      │
│  5. GitHub Actions runs on USER'S account:                           │
│     → Provisions AWS infrastructure via Terraform                    │
│     → Copies code and runs training                                  │
│     → Uploads results as GitHub Artifacts                            │
│     → Destroys infrastructure (automatic cleanup)                    │
│                                                                      │
│  6. TrainForge receives webhook updates                              │
│     → Shows real-time status in dashboard                            │
│     → Links to logs and artifact downloads                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### 2.2 GitHub App Permissions (Minimal Scope)

| Permission   | Access       | Reason                               |
| ------------ | ------------ | ------------------------------------ |
| **Actions**  | Read & Write | Trigger workflow_dispatch events     |
| **Contents** | Read & Write | Add trainforge.yml workflow file     |
| **Metadata** | Read         | Basic repo info (required by GitHub) |

**What we CAN'T access:**

- AWS credentials (stored in GitHub Secrets, encrypted)
- Repository source code (we only write the workflow file)
- User's GitHub account beyond selected repos

#### 2.3 What TrainForge Provides vs What Users Do

| TrainForge Does (Automated)    | User Does (Manual)                     |
| ------------------------------ | -------------------------------------- |
| Installs workflow file to repo | Clicks "Connect Repository"            |
| Triggers training runs via API | Adds AWS credentials to GitHub Secrets |
| Shows real-time job status     | Clicks "Start Training"                |
| Links to logs and artifacts    | Downloads results                      |

#### 2.4 Frontend (Next.js + Tailwind CSS)

| Page                | Description                                     |
| ------------------- | ----------------------------------------------- |
| `/`                 | Landing page with feature overview              |
| `/templates`        | Infrastructure template gallery with pricing    |
| `/connect`          | GitHub App installation flow                    |
| `/dashboard`        | Connected repos, start training, view status    |
| `/dashboard/[repo]` | Repo details, training history, trigger new run |

#### 2.5 Backend (FastAPI + PostgreSQL)

| Endpoint                               | Description                         |
| -------------------------------------- | ----------------------------------- |
| `GET /api/auth/github`                 | Redirect to GitHub App installation |
| `GET /api/auth/github/callback`        | Handle OAuth callback               |
| `GET /api/repos`                       | List connected repositories         |
| `POST /api/repos/{owner}/{repo}/setup` | Add workflow file to repository     |
| `POST /api/repos/{owner}/{repo}/train` | Trigger a training run              |
| `GET /api/repos/{owner}/{repo}/runs`   | List training runs for a repo       |
| `POST /api/webhooks/github`            | Receive workflow status updates     |

#### 2.6 Infrastructure Templates

| Template ID | Name      | Instance Type | GPU       | vCPU | RAM  | Storage | Est. Cost/hr |
| ----------- | --------- | ------------- | --------- | ---- | ---- | ------- | ------------ |
| `cpu-small` | CPU Small | t3.medium     | -         | 2    | 4GB  | 100GB   | $0.05        |
| `cpu-large` | CPU Large | t3.2xlarge    | -         | 8    | 32GB | 100GB   | $0.20        |
| `gpu-t4`    | GPU T4    | g4dn.xlarge   | T4 16GB   | 4    | 16GB | 125GB   | $0.75        |
| `gpu-a10`   | GPU A10   | g5.xlarge     | A10G 24GB | 4    | 16GB | 250GB   | $1.50        |

#### 2.7 Job Lifecycle

```
┌────────────┐    ┌─────────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│  TRIGGER   │───▶│  PROVISION  │───▶│  TRAIN  │───▶│  UPLOAD  │───▶│ CLEANUP  │
└────────────┘    └─────────────┘    └─────────┘    └──────────┘    └──────────┘
      │                 │                 │              │               │
      ▼                 ▼                 ▼              ▼               ▼
   TrainForge      Terraform         Training       Results to      Terraform
   triggers        creates EC2       executes       GH Artifacts    destroys
   via API         (user's AWS)      on instance    (user's GH)     infra
```

#### 2.8 Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend:** Python 3.11, FastAPI, SQLAlchemy
- **Database:** PostgreSQL (installations, repos, runs)
- **Auth:** GitHub App (installation-based)
- **Infrastructure:** Terraform (runs in user's GitHub Actions)
- **Real-time:** GitHub Webhooks → Server-Sent Events

---

### **Milestone 3: Training Platform & Observability**

**MVP:** Deploy the experiment tracking service (MLflow), container registry, and a lightweight monitoring stack (Prometheus + Grafana). Integrate with the web platform to show training metrics in real-time.

---

### **Milestone 4: End‑to‑End Automated Workflow**

**MVP:** Implement a fully reproducible workflow where the web platform handles the complete lifecycle from code upload to trained model download—demonstrating enterprise-grade ML infrastructure.

---

## 5. Core Components

### 5.1 Compute Resources

- Dedicated GPU node used for accelerated model training.
- CPU nodes handling lightweight training tasks and support services.
- Autoscaling or manual scaling depending on workload requirements.

### 5.2 Web Platform (TrainForge)

- **Template Gallery:** Pre-configured infrastructure options with real-time pricing
- **Code Manager:** GitHub integration and zip file uploads
- **Job Orchestrator:** Queue management, Terraform execution, status tracking
- **Log Streamer:** Real-time log viewing via WebSocket
- **Cleanup Automation:** Automatic infrastructure destruction after job completion

### 5.3 Experiment Tracking Server

- Centralized system storing experiment metadata, training configurations, evaluation metrics, and final models.

### 5.4 Storage

- Cloud storage bucket for artifact persistence.
- Local ephemeral and persistent volume options for intermediate job data.

### 5.5 Monitoring

- Metrics collection from compute nodes.
- Dashboards showing GPU utilization, CPU/RAM consumption, job durations, and system health.

### 5.6 Networking & Security

- Role-based permissions for compute instances.
- Secure network configuration across subnets and cluster components.

---

## 6. Training Workflow (GitHub Actions-Based)

1. **One-time setup** (5 minutes):

   - User adds `.github/workflows/trainforge.yml` to their repo (copy from template)
   - User adds AWS credentials to GitHub Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)
   - (Optional) User adds `TRAINFORGE_WEBHOOK_URL` for dashboard integration

2. **Each training run**:

   - User goes to GitHub → Actions → "TrainForge ML Training"
   - Selects template (cpu-small, gpu-t4, etc.) and configures options
   - Clicks "Run workflow"
   - GitHub Actions provisions AWS infrastructure via Terraform
   - Training code is copied to the instance and executed
   - Results are uploaded as GitHub Artifacts
   - Infrastructure is automatically destroyed

3. **Retrieving results**:
   - User downloads artifacts from the GitHub Actions run
   - Model files (.pt, .pth, .h5) are in the `training-results` artifact

---

## 7. Implementation Status

### Completed Components ✅

#### Infrastructure (Milestone 1)

- [x] VPC with public/private subnets (`terraform/modules/vpc`)
- [x] IAM roles for EC2 instances (`terraform/modules/iam`)
- [x] S3 bucket for artifacts (`terraform/modules/s3`)
- [x] EC2 module with CPU/GPU support (`terraform/modules/ec2`)
- [x] Main Terraform configuration (`terraform/main.tf`)

#### Frontend (web/frontend)

- [x] Next.js 16 project with App Router
- [x] Tailwind CSS v4 + shadcn/ui components
- [x] Landing page (`/`)
- [x] Templates gallery (`/templates`)
- [x] Jobs dashboard (`/jobs`)
- [x] Job details page (`/jobs/[id]`)
- [x] New job wizard (`/jobs/new`)
- [x] Setup page with GitHub App flow (`/setup`)
- [x] OAuth callback handler (`/setup/callback`)
- [x] Auth context with localStorage persistence
- [x] API client library

#### Backend (web/backend)

- [x] FastAPI application structure
- [x] SQLAlchemy models (Installation, Repository, TrainingRun)
- [x] Pydantic schemas for API
- [x] GitHub App integration (`app/github.py`)
- [x] Auth routes (OAuth flow, installations)
- [x] Repository routes (list, setup workflow)
- [x] Workflow routes (templates, trigger, runs)
- [x] Webhook routes (GitHub events)
- [x] Alembic migration setup

#### Documentation

- [x] GitHub App architecture (`docs/github-app-architecture.md`)
- [x] Workflow template (`docs/trainforge-workflow-template.yml`)
- [x] Setup guide (`docs/trainforge-setup-guide.md`)
- [x] Backend README with API documentation

### In Progress 🔄

- [ ] GitHub App creation on GitHub Developer Settings
- [ ] Frontend-backend integration testing
- [ ] Database migrations

### Pending 📋

- [ ] Production deployment configuration
- [ ] User session management (JWT)
- [ ] Real-time log streaming (SSE/WebSocket)
- [ ] Cost estimation calculator
- [ ] MLflow integration (Milestone 3)
- [ ] Monitoring stack (Milestone 3)

---

## 8. Automation Flow

1. Apply infrastructure-as-code to provision all cloud resources.
2. Deploy support services (experiment tracking, monitoring stack).
3. Configure compute nodes to receive and run containerized training tasks.
4. Provide entry points to submit training jobs and view outputs.

---

## 8. Deliverables

- Fully reproducible cloud infrastructure definition (Terraform).
- **Self-service web platform for ML training (TrainForge).**
- Training job templates and example workloads.
- Experiment tracking dashboards and logged examples.
- Monitoring dashboards displaying real-time compute metrics.
- Architecture diagram and operational documentation.
- Portfolio-friendly description, screenshots, and usage instructions.

---

## 9. Future Expansions

- Add distributed training support across multiple nodes.
- Implement CI/CD pipeline for automated deployment of training jobs.
- Add autoscaling rules for GPU nodes.
- Integrate a workflow orchestration system for multi-step ML pipelines.
- **Multi-cloud support (GCP, Azure).**
- **Team collaboration features (shared jobs, permissions).**
- **Cost tracking and billing integration.**
- **Spot/preemptible instance support for cost savings.**

---

## 10. Purpose and Impact

This project demonstrates the ability to design, provision, and operate modern AI-ready infrastructure. It showcases skills in cloud architecture, resource automation, containerized ML workflows, full-stack web development, and observability—ultimately functioning as a strong, practical, and visually demonstrable portfolio project.

---

## Appendix A: Web Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Frontend (Next.js 14)                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Landing  │  │ Templates │  │  New Job  │  │   Jobs    │  │  Job      │  │
│  │   Page    │  │  Gallery  │  │  Wizard   │  │ Dashboard │  │  Details  │  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ REST API + WebSocket
┌────────────────────────────────┴────────────────────────────────────────────┐
│                          Backend (FastAPI)                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Template  │  │  Pricing  │  │   Code    │  │    Job    │  │   Log     │  │
│  │  Service  │  │  Service  │  │  Service  │  │ Scheduler │  │ Streamer  │  │
│  └─────┬─────┘  └───────────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
└────────┼────────────────────────────┼──────────────┼──────────────┼────────┘
         │                            │              │              │
    ┌────┴────┐                  ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Postgres│                  │   S3    │    │  Redis  │    │   EC2   │
    │(metadata)                  │(storage)│    │ (queue) │    │(compute)│
    └─────────┘                  └─────────┘    └─────────┘    └─────────┘
                                                     │
                                               ┌─────┴─────┐
                                               │  Celery   │
                                               │  Workers  │
                                               └─────┬─────┘
                                                     │
                                               ┌─────┴─────┐
                                               │ Terraform │
                                               │ Executor  │
                                               └───────────┘
```

---

## Appendix B: Database Schema

```sql
-- Infrastructure Templates
CREATE TABLE templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    instance_type VARCHAR(50) NOT NULL,
    gpu_type VARCHAR(50),
    vcpu INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    storage_gb INTEGER NOT NULL,
    hourly_cost DECIMAL(10,4) NOT NULL,
    terraform_vars JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users (GitHub OAuth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Training Jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    template_id VARCHAR(50) REFERENCES templates(id),
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, creating, running, completed, failed, stopped
    code_source VARCHAR(20) NOT NULL,      -- upload, github
    code_path VARCHAR(500) NOT NULL,       -- S3 path or GitHub repo
    entry_point VARCHAR(200) DEFAULT 'train.py',
    env_vars JSONB DEFAULT '{}',
    instance_id VARCHAR(50),               -- EC2 instance ID when running
    public_ip VARCHAR(50),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cost_estimate DECIMAL(10,4),
    actual_cost DECIMAL(10,4),
    artifacts_path VARCHAR(500),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Job Logs (for persistence)
CREATE TABLE job_logs (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    level VARCHAR(10) DEFAULT 'INFO',
    message TEXT NOT NULL
);
```
