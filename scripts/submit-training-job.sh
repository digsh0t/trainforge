#!/bin/bash
# =============================================================================
# Submit Training Job to Remote GPU Instance
# =============================================================================

set -e

# Configuration
INSTANCE_IP="${INSTANCE_IP:?Error: INSTANCE_IP not set}"
SSH_KEY="${SSH_KEY:-~/.ssh/ai-training-cluster.pem}"
IMAGE_NAME="${IMAGE_NAME:-ai-training}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Training parameters
EPOCHS="${EPOCHS:-10}"
BATCH_SIZE="${BATCH_SIZE:-128}"
LEARNING_RATE="${LEARNING_RATE:-0.001}"

# S3 configuration
S3_BUCKET="${S3_BUCKET:?Error: S3_BUCKET not set}"
EXPERIMENT_NAME="${EXPERIMENT_NAME:-mnist-training}"
JOB_ID="${JOB_ID:-$(date +%Y%m%d-%H%M%S)}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Submitting Training Job to GPU Instance${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Instance: ${INSTANCE_IP}"
echo -e "Job ID: ${JOB_ID}"
echo -e "Epochs: ${EPOCHS}"
echo -e "Batch Size: ${BATCH_SIZE}"

# Check SSH key exists
if [ ! -f "${SSH_KEY}" ]; then
    echo -e "${RED}Error: SSH key not found at ${SSH_KEY}${NC}"
    exit 1
fi

# Create remote job directory
echo -e "${YELLOW}Setting up remote environment...${NC}"
ssh -i "${SSH_KEY}" ubuntu@"${INSTANCE_IP}" << EOF
    mkdir -p /opt/training/jobs/${JOB_ID}
    mkdir -p /opt/training/data
    mkdir -p /opt/training/output/${JOB_ID}
EOF

# Run training on remote instance
echo -e "${YELLOW}Starting training job...${NC}"
ssh -i "${SSH_KEY}" ubuntu@"${INSTANCE_IP}" << EOF
    set -e
    
    echo "Pulling latest training image..."
    # If using ECR, login first
    # aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
    
    echo "Running training container..."
    docker run --rm \
        --gpus all \
        -v /opt/training/data:/tmp/data \
        -v /opt/training/output/${JOB_ID}:/tmp/output \
        -e AWS_DEFAULT_REGION=us-east-1 \
        ${IMAGE_NAME}:${IMAGE_TAG} \
        python -m src.train \
            --epochs ${EPOCHS} \
            --batch-size ${BATCH_SIZE} \
            --learning-rate ${LEARNING_RATE} \
            --data-dir /tmp/data \
            --output-dir /tmp/output \
            --experiment-name ${EXPERIMENT_NAME}
    
    echo "Uploading artifacts to S3..."
    aws s3 sync /opt/training/output/${JOB_ID}/ s3://${S3_BUCKET}/experiments/${JOB_ID}/
    
    echo "Training job completed!"
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Job ${JOB_ID} completed!${NC}"
echo -e "${GREEN}Artifacts: s3://${S3_BUCKET}/experiments/${JOB_ID}/${NC}"
echo -e "${GREEN}========================================${NC}"
