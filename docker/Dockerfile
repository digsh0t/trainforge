# AI Training Container
# PyTorch base image with GPU support

FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

LABEL maintainer="AI Training Cluster"
LABEL description="Base container for ML training jobs"

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Create working directory
WORKDIR /app

# Copy training code
COPY src/ /app/src/
COPY scripts/ /app/scripts/

# Make scripts executable
RUN chmod +x /app/scripts/*.sh 2>/dev/null || true

# Default command
CMD ["python", "-m", "src.train"]
