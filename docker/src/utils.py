"""
AI Training Cluster - Utility Functions
Helper functions for logging, device management, and checkpointing.
"""

import os
import logging
import sys
from typing import Optional

import torch
import torch.nn as nn


def setup_logging(level: int = logging.INFO) -> None:
    """Configure logging for the training script."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def get_device() -> torch.device:
    """Get the best available device (GPU if available, else CPU)."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        # Set CUDA device for better memory management
        torch.cuda.set_device(0)
    else:
        device = torch.device("cpu")

    return device


def save_checkpoint(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    accuracy: float,
    path: str,
    extra_info: Optional[dict] = None,
) -> None:
    """
    Save a training checkpoint.

    Args:
        model: The model to save
        optimizer: The optimizer state to save
        epoch: Current epoch number
        accuracy: Current validation accuracy
        path: Path to save the checkpoint
        extra_info: Optional additional information to save
    """
    checkpoint = {
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "accuracy": accuracy,
    }

    if extra_info:
        checkpoint.update(extra_info)

    # Create directory if needed
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)

    torch.save(checkpoint, path)
    logging.info(f"Checkpoint saved to {path}")


def load_checkpoint(
    path: str,
    model: nn.Module,
    optimizer: Optional[torch.optim.Optimizer] = None,
    device: Optional[torch.device] = None,
) -> dict:
    """
    Load a training checkpoint.

    Args:
        path: Path to the checkpoint file
        model: Model to load weights into
        optimizer: Optional optimizer to load state into
        device: Device to load the checkpoint to

    Returns:
        Dictionary with checkpoint information (epoch, accuracy, etc.)
    """
    if device is None:
        device = get_device()

    checkpoint = torch.load(path, map_location=device)

    model.load_state_dict(checkpoint["model_state_dict"])

    if optimizer is not None and "optimizer_state_dict" in checkpoint:
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])

    logging.info(f"Checkpoint loaded from {path}")
    logging.info(
        f"Epoch: {checkpoint.get('epoch', 'N/A')}, Accuracy: {checkpoint.get('accuracy', 'N/A')}"
    )

    return checkpoint


def count_parameters(model: nn.Module) -> int:
    """Count the number of trainable parameters in a model."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def get_gpu_memory_info() -> dict:
    """Get GPU memory usage information."""
    if not torch.cuda.is_available():
        return {"available": False}

    return {
        "available": True,
        "device_name": torch.cuda.get_device_name(0),
        "total_memory_gb": torch.cuda.get_device_properties(0).total_memory / 1e9,
        "allocated_memory_gb": torch.cuda.memory_allocated(0) / 1e9,
        "cached_memory_gb": torch.cuda.memory_reserved(0) / 1e9,
    }
