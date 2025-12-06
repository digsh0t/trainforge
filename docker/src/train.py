"""
AI Training Cluster - Training Module
Example training script demonstrating GPU training with MLflow tracking.
"""

import os
import argparse
import logging
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import mlflow

from .model import SimpleCNN
from .utils import setup_logging, get_device, save_checkpoint

# Setup logging
logger = logging.getLogger(__name__)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Train a CNN model on MNIST")

    # Training parameters
    parser.add_argument(
        "--epochs", type=int, default=5, help="Number of training epochs"
    )
    parser.add_argument(
        "--batch-size", type=int, default=64, help="Batch size for training"
    )
    parser.add_argument(
        "--learning-rate", type=float, default=0.001, help="Learning rate"
    )
    parser.add_argument("--momentum", type=float, default=0.9, help="SGD momentum")

    # Data parameters
    parser.add_argument(
        "--data-dir", type=str, default="/tmp/data", help="Directory for dataset"
    )

    # Output parameters
    parser.add_argument(
        "--output-dir", type=str, default="/tmp/output", help="Directory for outputs"
    )
    parser.add_argument(
        "--checkpoint-interval",
        type=int,
        default=1,
        help="Save checkpoint every N epochs",
    )

    # MLflow parameters
    parser.add_argument(
        "--mlflow-tracking-uri", type=str, default=None, help="MLflow tracking URI"
    )
    parser.add_argument(
        "--experiment-name",
        type=str,
        default="mnist-training",
        help="MLflow experiment name",
    )

    return parser.parse_args()


def get_data_loaders(data_dir: str, batch_size: int):
    """Create training and validation data loaders."""
    transform = transforms.Compose(
        [transforms.ToTensor(), transforms.Normalize((0.1307,), (0.3081,))]
    )

    train_dataset = datasets.MNIST(
        root=data_dir, train=True, download=True, transform=transform
    )

    val_dataset = datasets.MNIST(
        root=data_dir, train=False, download=True, transform=transform
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=2,
        pin_memory=True,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=2,
        pin_memory=True,
    )

    return train_loader, val_loader


def train_epoch(model, train_loader, optimizer, criterion, device, epoch):
    """Train for one epoch."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)

        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        pred = output.argmax(dim=1, keepdim=True)
        correct += pred.eq(target.view_as(pred)).sum().item()
        total += target.size(0)

        if batch_idx % 100 == 0:
            logger.info(
                f"Epoch {epoch} [{batch_idx * len(data)}/{len(train_loader.dataset)} "
                f"({100. * batch_idx / len(train_loader):.0f}%)] Loss: {loss.item():.6f}"
            )

    avg_loss = total_loss / len(train_loader)
    accuracy = 100.0 * correct / total

    return avg_loss, accuracy


def validate(model, val_loader, criterion, device):
    """Validate the model."""
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for data, target in val_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            total_loss += criterion(output, target).item()
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()
            total += target.size(0)

    avg_loss = total_loss / len(val_loader)
    accuracy = 100.0 * correct / total

    return avg_loss, accuracy


def main():
    """Main training function."""
    args = parse_args()
    setup_logging()

    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)

    # Setup device
    device = get_device()
    logger.info(f"Using device: {device}")

    # Log GPU info if available
    if torch.cuda.is_available():
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logger.info(
            f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB"
        )

    # Setup MLflow
    if args.mlflow_tracking_uri:
        mlflow.set_tracking_uri(args.mlflow_tracking_uri)
    mlflow.set_experiment(args.experiment_name)

    # Get data loaders
    logger.info("Loading datasets...")
    train_loader, val_loader = get_data_loaders(args.data_dir, args.batch_size)
    logger.info(f"Training samples: {len(train_loader.dataset)}")
    logger.info(f"Validation samples: {len(val_loader.dataset)}")

    # Create model
    model = SimpleCNN().to(device)
    logger.info(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Setup training
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.SGD(
        model.parameters(), lr=args.learning_rate, momentum=args.momentum
    )

    # Start MLflow run
    with mlflow.start_run():
        # Log parameters
        mlflow.log_params(
            {
                "epochs": args.epochs,
                "batch_size": args.batch_size,
                "learning_rate": args.learning_rate,
                "momentum": args.momentum,
                "device": str(device),
                "model_params": sum(p.numel() for p in model.parameters()),
            }
        )

        best_val_accuracy = 0.0

        # Training loop
        for epoch in range(1, args.epochs + 1):
            logger.info(f"\n{'='*50}")
            logger.info(f"Epoch {epoch}/{args.epochs}")
            logger.info(f"{'='*50}")

            # Train
            train_loss, train_accuracy = train_epoch(
                model, train_loader, optimizer, criterion, device, epoch
            )

            # Validate
            val_loss, val_accuracy = validate(model, val_loader, criterion, device)

            # Log metrics
            mlflow.log_metrics(
                {
                    "train_loss": train_loss,
                    "train_accuracy": train_accuracy,
                    "val_loss": val_loss,
                    "val_accuracy": val_accuracy,
                },
                step=epoch,
            )

            logger.info(
                f"Train Loss: {train_loss:.4f}, Train Accuracy: {train_accuracy:.2f}%"
            )
            logger.info(f"Val Loss: {val_loss:.4f}, Val Accuracy: {val_accuracy:.2f}%")

            # Save checkpoint
            if epoch % args.checkpoint_interval == 0:
                checkpoint_path = os.path.join(
                    args.output_dir, f"checkpoint_epoch_{epoch}.pt"
                )
                save_checkpoint(model, optimizer, epoch, val_accuracy, checkpoint_path)
                mlflow.log_artifact(checkpoint_path)

            # Save best model
            if val_accuracy > best_val_accuracy:
                best_val_accuracy = val_accuracy
                best_model_path = os.path.join(args.output_dir, "best_model.pt")
                save_checkpoint(model, optimizer, epoch, val_accuracy, best_model_path)
                mlflow.log_artifact(best_model_path)
                logger.info(f"New best model saved with accuracy: {val_accuracy:.2f}%")

        # Log final model
        mlflow.pytorch.log_model(model, "model")
        mlflow.log_metric("best_val_accuracy", best_val_accuracy)

        logger.info(f"\n{'='*50}")
        logger.info(f"Training completed!")
        logger.info(f"Best validation accuracy: {best_val_accuracy:.2f}%")
        logger.info(f"{'='*50}")


if __name__ == "__main__":
    main()
