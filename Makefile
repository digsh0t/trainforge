# =============================================================================
# AI Training Cluster - Makefile
# =============================================================================
# Convenience commands for managing the training cluster
# =============================================================================

.PHONY: help init plan apply destroy build train clean

# Default target
help:
	@echo "AI Training Cluster - Available Commands"
	@echo "=========================================="
	@echo ""
	@echo "Infrastructure:"
	@echo "  make init      - Initialize Terraform"
	@echo "  make plan      - Preview infrastructure changes"
	@echo "  make apply     - Deploy infrastructure"
	@echo "  make destroy   - Tear down infrastructure"
	@echo "  make output    - Show Terraform outputs"
	@echo ""
	@echo "Docker:"
	@echo "  make build     - Build training container"
	@echo "  make push      - Build and push to ECR"
	@echo ""
	@echo "Training:"
	@echo "  make train     - Run training locally"
	@echo "  make submit    - Submit job to remote GPU"
	@echo ""
	@echo "Utilities:"
	@echo "  make ssh       - SSH to GPU instance"
	@echo "  make status    - Check GPU instance status"
	@echo "  make clean     - Clean local artifacts"

# =============================================================================
# Infrastructure Commands
# =============================================================================

init:
	@echo "Initializing Terraform..."
	cd terraform && terraform init

plan:
	@echo "Planning infrastructure changes..."
	cd terraform && terraform plan

apply:
	@echo "Applying infrastructure..."
	cd terraform && terraform apply

destroy:
	@echo "Destroying infrastructure..."
	cd terraform && terraform destroy

output:
	@echo "Terraform outputs:"
	cd terraform && terraform output

# =============================================================================
# Docker Commands
# =============================================================================

build:
	@echo "Building Docker image..."
	./scripts/build-image.sh

push:
	@echo "Building and pushing to ECR..."
	PUSH_TO_ECR=true ./scripts/build-image.sh

# =============================================================================
# Training Commands
# =============================================================================

train:
	@echo "Running training locally..."
	./scripts/run-training-local.sh

submit:
	@echo "Submitting training job..."
	./scripts/submit-training-job.sh

# =============================================================================
# Utility Commands
# =============================================================================

ssh:
	@echo "Connecting to GPU instance..."
	@GPU_IP=$$(cd terraform && terraform output -raw gpu_instance_public_ip 2>/dev/null) && \
	KEY_PATH=$$(cd terraform && terraform output -raw ssh_private_key_path 2>/dev/null) && \
	if [ -n "$$GPU_IP" ] && [ -n "$$KEY_PATH" ]; then \
		ssh -i $$KEY_PATH ubuntu@$$GPU_IP; \
	else \
		echo "Error: Could not get GPU instance IP. Is the infrastructure deployed?"; \
	fi

status:
	@echo "Checking GPU instance status..."
	@GPU_ID=$$(cd terraform && terraform output -raw gpu_instance_id 2>/dev/null) && \
	if [ -n "$$GPU_ID" ]; then \
		aws ec2 describe-instance-status --instance-ids $$GPU_ID; \
	else \
		echo "Error: Could not get GPU instance ID. Is the infrastructure deployed?"; \
	fi

clean:
	@echo "Cleaning local artifacts..."
	rm -rf /tmp/training-data /tmp/training-output
	docker image prune -f
	@echo "Clean complete!"

# =============================================================================
# Cost Management
# =============================================================================

stop-gpu:
	@echo "Stopping GPU instance to save costs..."
	@GPU_ID=$$(cd terraform && terraform output -raw gpu_instance_id 2>/dev/null) && \
	if [ -n "$$GPU_ID" ]; then \
		aws ec2 stop-instances --instance-ids $$GPU_ID; \
		echo "GPU instance stopping..."; \
	else \
		echo "Error: Could not get GPU instance ID."; \
	fi

start-gpu:
	@echo "Starting GPU instance..."
	@GPU_ID=$$(cd terraform && terraform output -raw gpu_instance_id 2>/dev/null) && \
	if [ -n "$$GPU_ID" ]; then \
		aws ec2 start-instances --instance-ids $$GPU_ID; \
		echo "GPU instance starting..."; \
	else \
		echo "Error: Could not get GPU instance ID."; \
	fi
