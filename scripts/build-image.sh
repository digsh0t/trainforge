#!/bin/bash
# =============================================================================
# Build and Push Docker Image to ECR
# =============================================================================

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
IMAGE_NAME="${IMAGE_NAME:-ai-training}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building AI Training Container${NC}"
echo -e "${GREEN}========================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/../docker"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" "${DOCKER_DIR}"

echo -e "${GREEN}Docker image built successfully: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"

# Optional: Push to ECR
if [ "$PUSH_TO_ECR" = "true" ]; then
    echo -e "${YELLOW}Pushing to ECR...${NC}"
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"
    
    # Login to ECR
    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Create repository if it doesn't exist
    aws ecr describe-repositories --repository-names "${IMAGE_NAME}" --region "${AWS_REGION}" > /dev/null 2>&1 || \
        aws ecr create-repository --repository-name "${IMAGE_NAME}" --region "${AWS_REGION}"
    
    # Tag and push
    docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${ECR_REPO}:${IMAGE_TAG}"
    docker push "${ECR_REPO}:${IMAGE_TAG}"
    
    echo -e "${GREEN}Image pushed to ECR: ${ECR_REPO}:${IMAGE_TAG}${NC}"
fi

echo -e "${GREEN}Build complete!${NC}"
