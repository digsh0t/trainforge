#!/bin/bash
# =============================================================================
# Run Training Job Locally
# =============================================================================

set -e

# Configuration
IMAGE_NAME="${IMAGE_NAME:-ai-training}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DATA_DIR="${DATA_DIR:-/tmp/training-data}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/training-output}"

# Training parameters
EPOCHS="${EPOCHS:-5}"
BATCH_SIZE="${BATCH_SIZE:-64}"
LEARNING_RATE="${LEARNING_RATE:-0.001}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Running Training Job Locally${NC}"
echo -e "${GREEN}========================================${NC}"

# Create directories
mkdir -p "${DATA_DIR}"
mkdir -p "${OUTPUT_DIR}"

# Check for GPU
GPU_FLAG=""
if command -v nvidia-smi &> /dev/null && docker info 2>/dev/null | grep -q "Runtimes.*nvidia"; then
    echo -e "${YELLOW}GPU detected, enabling CUDA${NC}"
    GPU_FLAG="--gpus all"
else
    echo -e "${YELLOW}No GPU detected, running on CPU${NC}"
fi

# Run training container
echo -e "${YELLOW}Starting training...${NC}"
docker run --rm \
    ${GPU_FLAG} \
    -v "${DATA_DIR}:/tmp/data" \
    -v "${OUTPUT_DIR}:/tmp/output" \
    -e MLFLOW_TRACKING_URI="${MLFLOW_TRACKING_URI:-}" \
    "${IMAGE_NAME}:${IMAGE_TAG}" \
    python -m src.train \
        --epochs "${EPOCHS}" \
        --batch-size "${BATCH_SIZE}" \
        --learning-rate "${LEARNING_RATE}" \
        --data-dir /tmp/data \
        --output-dir /tmp/output

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Training complete!${NC}"
echo -e "${GREEN}Output saved to: ${OUTPUT_DIR}${NC}"
echo -e "${GREEN}========================================${NC}"
