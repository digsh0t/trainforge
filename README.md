# AI Training Cluster

A cloud-based AI training cluster for running containerized machine learning workloads on GPU-enabled infrastructure. Built with Infrastructure-as-Code for reproducibility and easy deployment.

## 🎯 Features

- **GPU-Accelerated Training**: Provision GPU instances (NVIDIA T4) for ML model training
- **Infrastructure-as-Code**: Complete AWS infrastructure defined in Terraform
- **Containerized Workloads**: Docker-based training jobs for consistency
- **Experiment Tracking**: MLflow integration for metrics, parameters, and artifacts
- **Cloud Storage**: S3 bucket for datasets, checkpoints, and model artifacts
- **Security**: IAM roles with least-privilege access, VPC isolation

## 📁 Project Structure

```
ai-training-cluster-setup/
├── terraform/                 # Infrastructure-as-Code
│   ├── main.tf               # Main orchestration
│   ├── variables.tf          # Input variables
│   ├── outputs.tf            # Output values
│   ├── providers.tf          # AWS provider config
│   └── modules/
│       ├── networking/       # VPC, subnets, security groups
│       ├── storage/          # S3 bucket configuration
│       ├── iam/              # IAM roles and policies
│       └── compute/          # EC2 GPU instances
├── docker/                   # Training container
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       ├── train.py          # Training script
│       ├── model.py          # CNN model definition
│       └── utils.py          # Helper functions
├── scripts/                  # Utility scripts
│   ├── build-image.sh        # Build Docker image
│   ├── run-training-local.sh # Local training
│   └── submit-training-job.sh # Remote job submission
├── Makefile                  # Convenience commands
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Terraform](https://terraform.io/) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- [Docker](https://docker.com/) for building containers
- An AWS account with permissions to create EC2, VPC, S3, and IAM resources

### 1. Clone and Configure

```bash
cd ai-training-cluster-setup

# Copy and edit the example variables file
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Edit `terraform/terraform.tfvars`:

- Set `allowed_ssh_cidrs` to your IP address
- Set `key_pair_name` to your AWS key pair name
- Adjust instance types if needed

### 2. Deploy Infrastructure

```bash
# Initialize Terraform
make init

# Preview changes
make plan

# Deploy (this will create AWS resources - costs apply!)
make apply
```

### 3. Build Training Container

```bash
# Build the Docker image locally
make build

# Or build and push to ECR
make push
```

### 4. Run Training

```bash
# Run training locally (CPU or GPU if available)
make train

# Or submit to the remote GPU instance
export INSTANCE_IP=$(cd terraform && terraform output -raw gpu_instance_public_ip)
export S3_BUCKET=$(cd terraform && terraform output -raw artifacts_bucket_name)
make submit
```

## 💰 Cost Management

GPU instances can be expensive. Use these commands to manage costs:

```bash
# Stop the GPU instance when not in use
make stop-gpu

# Start it when you need to train
make start-gpu
```

The `g4dn.xlarge` instance costs approximately $0.526/hour on-demand.

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                         VPC                                │  │
│  │  ┌─────────────────┐       ┌─────────────────────────┐   │  │
│  │  │  Public Subnet  │       │    Private Subnet       │   │  │
│  │  │  ┌───────────┐  │       │                         │   │  │
│  │  │  │ GPU Node  │  │       │  (Future: MLflow,       │   │  │
│  │  │  │ (g4dn)    │  │       │   Monitoring Stack)     │   │  │
│  │  │  └───────────┘  │       │                         │   │  │
│  │  └─────────────────┘       └─────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                      S3 Bucket                             │  │
│  │  datasets/ │ checkpoints/ │ models/ │ logs/ │ experiments/│  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Terraform Variables

| Variable            | Description                | Default       |
| ------------------- | -------------------------- | ------------- |
| `aws_region`        | AWS region for deployment  | `us-east-1`   |
| `environment`       | Environment name           | `dev`         |
| `gpu_instance_type` | EC2 instance type for GPU  | `g4dn.xlarge` |
| `allowed_ssh_cidrs` | CIDR blocks for SSH access | `[]`          |
| `key_pair_name`     | EC2 key pair name          | `""`          |
| `enable_gpu_node`   | Create GPU instance        | `true`        |

### Training Parameters

Set via environment variables:

```bash
export EPOCHS=10
export BATCH_SIZE=128
export LEARNING_RATE=0.001
make train
```

## 🛠 Development

### Local Training

Test the training container locally:

```bash
# Build image
make build

# Run with CPU
make train

# Run with local GPU (requires NVIDIA Docker runtime)
EPOCHS=2 make train
```

### Modifying the Model

Edit `docker/src/model.py` to change the neural network architecture, then rebuild:

```bash
make build
```

## 📈 Milestones

- [x] **Milestone 1**: Core Infrastructure Setup

  - [x] VPC, subnets, security groups
  - [x] S3 bucket for artifacts
  - [x] IAM roles and policies
  - [x] GPU EC2 instance

- [ ] **Milestone 2**: Training Platform & Observability

  - [ ] MLflow tracking server
  - [ ] Prometheus + Grafana monitoring
  - [ ] Container registry (ECR)

- [ ] **Milestone 3**: End-to-End Automation
  - [ ] Automated job submission
  - [ ] CI/CD pipeline
  - [ ] Autoscaling configuration

## 🧹 Cleanup

To avoid ongoing AWS charges, destroy the infrastructure when done:

```bash
make destroy
```

## 📄 License

MIT License - see LICENSE file for details.
