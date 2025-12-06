---
title: 'TrainForge - Train ML Models in the Cloud Without Trusting Anyone'
excerpt: 'Building a self-service ML training platform that uses GitHub Actions to run on YOUR infrastructure, so you never have to share AWS credentials'
date: '2025-12-06'
---

I've been training ML models in the cloud for a while now, and one thing that always annoyed me was the trust problem. Every ML platform wants your AWS keys, or wants you to run workloads on their infrastructure. I wanted something different: a platform where I can just click a button and train a model, but the compute runs on MY AWS account, not some third-party service.

TrainForge is my answer to that problem. It's a self-service platform that lets you train models with one click, but all the compute happens in your own GitHub Actions + AWS account. I never see your AWS credentials. This post will walk you through why this approach makes sense and how it actually works.

## Why this problem exists

Before we dive in, let's talk about the situations where you even need this.

### The "shiny new model" problem

You see a new model on Hugging Face or a cool paper on arXiv. You want to try it out. But then you look at the requirements:

- "Requires 24GB VRAM" - you have a laptop with 8GB
- "Training takes 12 hours on 4x A100s" - you have a MacBook
- "Tested on Linux with CUDA 11.8" - you're on an M1 Mac

Your options are pretty limited. You could:

1. Buy a $3000 GPU workstation (expensive, overkill for one experiment)
2. Rent a cloud GPU for a few hours (requires setting up cloud accounts, learning Terraform)
3. Use a managed ML platform (requires trusting them with credentials or data)

None of these are great if you just want to run a quick experiment.

### The trust problem with ML platforms

Most ML training platforms follow one of two patterns:

**Pattern 1: "Give us your AWS keys"**

- You paste AWS credentials into their dashboard
- They provision infrastructure in your account
- You have to trust them with admin-level access
- If they get breached, so do you

**Pattern 2: "Run on our infrastructure"**

- You upload your code and data to their servers
- They run your training on their GPUs
- Convenient, but expensive and you lose control
- Your data and models live on their systems

Both patterns require significant trust. What if there was a third way?

## How TrainForge works differently

The core idea is simple: TrainForge orchestrates your training, but never touches your credentials or infrastructure.

```
You click "Train" → TrainForge triggers workflow → GitHub Actions provisions AWS → Training runs → Infrastructure destroyed
```

All the heavy lifting happens in GitHub Actions running on YOUR account. TrainForge just provides the UI and automation layer.

Here's what happens under the hood:

### Step 1: Connect your GitHub repo

You install the TrainForge GitHub App and grant it access to specific repositories. The permissions are minimal:

- **Contents**: Read & Write - so we can add the workflow file
- **Actions**: Read & Write - so we can trigger training runs

That's it. We can't read your source code (only write the workflow file), and we definitely can't access GitHub Secrets.

### Step 2: We add the workflow file

When you connect a repo, TrainForge automatically creates `.github/workflows/trainforge.yml` in your repository. This workflow file contains all the logic for:

- Provisioning AWS infrastructure with Terraform
- Copying your code to the instance
- Running your training script
- Uploading results as GitHub Artifacts
- Destroying everything when done

You can inspect this file - it's just a normal GitHub Actions workflow that happens to use our Terraform templates.

### Step 3: You add AWS credentials to GitHub Secrets

This is the key part. You add your AWS credentials directly to your GitHub repository's secrets:

```
Your Repo → Settings → Secrets and variables → Actions
```

Add these three secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

GitHub encrypts these secrets and makes them available ONLY to your workflows. TrainForge never sees them. Not when you add them, not when the workflow runs, never.

### Step 4: Click "Train" in TrainForge

You go to the TrainForge dashboard, select your repo, choose a template (cpu-small, gpu-t4, etc.), and click "Start Training".

TrainForge uses the GitHub API to trigger a `workflow_dispatch` event. This is like clicking "Run workflow" in the GitHub Actions UI, but automated.

### Step 5: GitHub Actions does the work

Your workflow starts running in GitHub's infrastructure. It:

1. Checks out your code
2. Uses Terraform to provision an EC2 instance in YOUR AWS account
3. SSHs into the instance and copies your training code
4. Runs `python train.py` (or whatever you configured)
5. Waits for training to finish
6. Downloads results and uploads them as GitHub Artifacts
7. Destroys the EC2 instance with `terraform destroy`

All of this happens in your GitHub Actions quota, using your AWS account. TrainForge just receives webhook updates about the status.

## Understanding GitHub Secrets

This part confused me when I first started building this. Let me explain how GitHub Secrets actually work.

When you add a secret to your repository, GitHub encrypts it with a key that only GitHub has. The secret is never exposed in logs, never returned by the API, and only decrypted when a workflow runs.

```
Your AWS key → GitHub encrypts → Stored in GitHub's vault → Workflow runs → GitHub decrypts → Available as $AWS_ACCESS_KEY_ID
```

The TrainForge GitHub App can trigger workflows via the API, but it can't read secrets. This is a core security feature of GitHub Actions.

So when the workflow runs and executes `terraform apply`, Terraform gets the AWS credentials from the environment variables that GitHub injected - TrainForge never touched them.

## Templates explained

TrainForge provides infrastructure templates for different workload sizes. Each template is just a Terraform module.

The templates we support:

**cpu-small**: 2 vCPU, 4GB RAM (~$0.05/hr)

- Good for testing, small datasets, debugging
- Uses `t3.medium` instances

**cpu-large**: 8 vCPU, 32GB RAM (~$0.20/hr)

- Data preprocessing, CPU-intensive training
- Uses `c5.2xlarge` instances

**gpu-t4**: NVIDIA T4 GPU, 16GB VRAM (~$0.75/hr)

- Most deep learning workloads
- Uses `g4dn.xlarge` instances

**gpu-a10**: NVIDIA A10G GPU, 24GB VRAM (~$1.50/hr)

- Large models, faster training
- Uses `g5.xlarge` instances

When you select a template, the workflow passes it as an input to Terraform, which provisions the matching instance type.

## The GitHub Actions workflow breakdown

Let me walk through what's actually happening in that workflow file we add to your repo.

```yaml
name: TrainForge ML Training

on:
  workflow_dispatch:
    inputs:
      template:
        description: 'Infrastructure template'
        required: true
        type: choice
        options:
          - cpu-small
          - gpu-t4
          - gpu-a10
      run_command:
        description: 'Command to run'
        default: 'python train.py'
      max_runtime_hours:
        description: 'Max runtime (hours)'
        default: '2'
```

The `workflow_dispatch` trigger means this can be started manually (or via API, which is what TrainForge does).

The inputs define what you can configure. TrainForge provides a nice UI for these, but you can also just click "Run workflow" in GitHub and fill them in manually.

```yaml
jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
```

Standard GitHub Actions stuff. We check out your code and install Terraform.

```yaml
- name: Provision infrastructure
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_REGION: ${{ secrets.AWS_REGION }}
  run: |
    cd terraform/examples/${{ inputs.template }}
    terraform init
    terraform apply -auto-approve
```

This is where the magic happens. Terraform provisions your infrastructure using YOUR AWS credentials from GitHub Secrets.

The `cd terraform/examples/${{ inputs.template }}` line navigates to the template-specific Terraform code. Each template has its own directory with the right instance type configured.

```yaml
- name: Run training
  run: |
    INSTANCE_IP=$(terraform output -raw instance_ip)
    scp -r ./train.py ubuntu@$INSTANCE_IP:~/
    ssh ubuntu@$INSTANCE_IP "${{ inputs.run_command }}"
```

Copy your training script to the instance and run it. The instance IP comes from Terraform's output.

```yaml
- name: Download results
  run: |
    mkdir -p results
    scp -r ubuntu@$INSTANCE_IP:~/results/* ./results/

- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: training-results
    path: results/
```

Grab the results from the instance and upload them as GitHub Artifacts. You can download these from the Actions UI or via API.

```yaml
- name: Cleanup
  if: always()
  run: |
    cd terraform/examples/${{ inputs.template }}
    terraform destroy -auto-approve
```

The `if: always()` ensures this runs even if training fails. We don't want orphaned infrastructure costing you money.

## What TrainForge actually stores

Since we never see your AWS credentials or source code, what DO we store?

Our database schema is pretty simple:

```python
class Installation(Base):
    """GitHub App installation."""
    id = Column(Integer, primary_key=True)
    installation_id = Column(Integer, unique=True)  # GitHub's ID
    account_login = Column(String)  # Your GitHub username
    account_type = Column(String)  # "User" or "Organization"

class Repository(Base):
    """Connected repository."""
    id = Column(Integer, primary_key=True)
    installation_id = Column(Integer, ForeignKey("installations.id"))
    owner = Column(String)
    name = Column(String)
    has_workflow = Column(Boolean)  # Did we add trainforge.yml?

class TrainingRun(Base):
    """Training run record."""
    id = Column(Integer, primary_key=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    github_run_id = Column(Integer)  # GitHub Actions run ID
    template = Column(String)  # cpu-small, gpu-t4, etc.
    status = Column(String)  # queued, in_progress, completed, failed
    created_at = Column(DateTime)
    completed_at = Column(DateTime)
```

That's it. We store:

- Which repos you connected
- Whether we added the workflow file
- Which training runs you started and their status

We don't store your code, your data, your models, or your credentials. Everything lives in your GitHub repo and AWS account.

## Troubleshooting

I've hit pretty much every possible issue while building this. Here's how to fix the common ones.

### Workflow fails with "terraform: command not found"

The workflow needs the Terraform setup action. Make sure you have this step:

```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3
```

If it's still failing, check that you're using a recent GitHub Actions runner. We need `ubuntu-latest` or newer.

### Training runs but results aren't uploaded

Your training script needs to save results to a specific directory. By default, we look for `results/` or any `.pt`/`.pth`/`.h5` files.

Make sure your script does:

```python
import os
os.makedirs('results', exist_ok=True)
torch.save(model.state_dict(), 'results/model.pt')
```

### AWS credentials error

If you see "Error: No valid credential sources found", it means GitHub Secrets aren't configured.

Go to your repo → Settings → Secrets and variables → Actions

Make sure you added all three:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

The names must match exactly (all caps, underscores).

### Infrastructure provisioning fails

Check the Terraform logs in the GitHub Actions output. Common issues:

1. **AWS quota limits** - You might not have quota for GPU instances in your region. Try `us-east-1` or `us-west-2`.

2. **IAM permissions** - Your AWS credentials need permissions to create EC2, VPC, and IAM resources. The easiest solution is to use credentials with `AdministratorAccess` (but see security note below).

3. **Wrong region** - Some instance types aren't available in all regions. `g4dn` (T4 GPUs) work in most regions, but `g5` (A10 GPUs) are more limited.

### Workflow triggers but nothing happens

Check the GitHub Actions tab in your repo. If you see "Waiting for approval", it means your repo requires manual approval for workflow runs.

Go to Settings → Actions → General → scroll to "Fork pull request workflows" and make sure "Require approval for all outside collaborators" is disabled (or approve the workflow).

### Can't download artifacts

GitHub artifacts are only available for 90 days by default (configurable). If your training run is older than that, the artifacts are gone.

For long-term storage, modify the workflow to upload results to S3 instead:

```yaml
- name: Upload to S3
  run: |
    aws s3 sync ./results/ s3://my-bucket/training-runs/${{ github.run_id }}/
```

## Security considerations

A few things to keep in mind when using this setup.

### AWS credentials scope

The GitHub Secrets approach is secure, but you should still use least-privilege credentials. Create an IAM user specifically for TrainForge with only the permissions needed:

- EC2: Full access (to provision instances)
- VPC: Full access (to create networking)
- IAM: Limited (only to create instance profiles)

Don't use your root AWS credentials or personal admin credentials.

### GitHub App permissions

The TrainForge GitHub App can write to your repo (to add the workflow file) and trigger workflows. If you're paranoid, you can:

1. Review the workflow file we add before running it
2. Only grant access to specific repos, not your whole organization
3. Revoke access after you're done training

### Network security

The default Terraform templates create a VPC with a public subnet. The training instance has a public IP so GitHub Actions can SSH to it.

If you want more security:

- Modify the templates to use private subnets + bastion host
- Use AWS Systems Manager Session Manager instead of SSH
- Add IP allowlists to the security groups

### Costs

Remember that YOU pay for the AWS infrastructure. GitHub Actions minutes are separate (you get 2000 free minutes/month for private repos).

The workflow includes `terraform destroy` to clean up, but if that step fails, you might have orphaned resources. Set up AWS billing alerts!

## Running locally

If you want to test the workflow locally before pushing to GitHub, you can use `act` (a tool that runs GitHub Actions locally).

```bash
# Install act
brew install act

# Run the workflow locally
act workflow_dispatch \
  -s AWS_ACCESS_KEY_ID=your-key \
  -s AWS_SECRET_ACCESS_KEY=your-secret \
  -s AWS_REGION=us-east-1 \
  --input template=cpu-small \
  --input run_command="python train.py"
```

This will execute the workflow on your machine using Docker. It's great for debugging Terraform issues without burning GitHub Actions minutes.

## Deploying TrainForge yourself

The whole TrainForge platform is open source. If you want to run your own instance (maybe for your team or organization), here's the stack:

**Frontend**: Next.js 16 + Tailwind CSS + shadcn/ui components

**Backend**: FastAPI + PostgreSQL + SQLAlchemy

**Infrastructure**: Kubernetes (I'm running it on a bare metal cluster, but any K8s works)

**Ingress**: Cloudflare Tunnel (so you don't need public IPs)

The repo includes:

- Terraform modules for the AWS infrastructure templates
- Kubernetes manifests for deploying the web app
- Docker Compose setup for local development
- Database migrations with Alembic

Clone it and follow the deployment guide:

```bash
git clone https://github.com/your-username/trainforge
cd trainforge
make deploy
```

You'll need to create your own GitHub App and configure the credentials. The setup guide walks through everything.

## What's next

There are a few features I'm still working on:

**Cost estimation**: Show estimated AWS costs before you click "Train". I have the math figured out, just need to add it to the UI.

**Multi-cloud support**: Right now it's AWS-only, but the architecture works with GCP or Azure too. Just need to write the Terraform templates.

**Spot instances**: Use AWS spot instances to cut costs by 70%. The tricky part is handling interruptions gracefully.

**Training metrics**: Stream metrics from the training run to the TrainForge dashboard in real-time. Right now you have to check the GitHub Actions logs.

**Team features**: Share repositories across an organization, manage quotas, cost tracking per team member.

If you have other ideas, open an issue on GitHub.

## Wrapping up

The core idea here is pretty simple: use GitHub Actions as the execution layer and GitHub Secrets as the credential store. This lets you build a self-service ML platform without the trust issues of traditional platforms.

TrainForge provides the orchestration and UI, but all the sensitive stuff (credentials, code, compute) stays in your own accounts. It's the best of both worlds - convenience without giving up control.

If you want to try it out, head to trainforge.dev and connect a repo. The first few training runs are on me (I cover the GitHub Actions minutes via a sponsored account).

Thanks for reading!
