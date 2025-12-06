"""
AI Training Cluster - CNN Model
Simple CNN model for MNIST classification.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class SimpleCNN(nn.Module):
    """
    Simple Convolutional Neural Network for MNIST digit classification.

    Architecture:
    - 2 Convolutional layers with ReLU and MaxPooling
    - 2 Fully connected layers
    - Dropout for regularization
    """

    def __init__(self, num_classes: int = 10, dropout_rate: float = 0.5):
        super(SimpleCNN, self).__init__()

        # Convolutional layers
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)

        # Pooling layer
        self.pool = nn.MaxPool2d(2, 2)

        # Fully connected layers
        # After 2 pooling operations: 28x28 -> 14x14 -> 7x7
        self.fc1 = nn.Linear(64 * 7 * 7, 128)
        self.fc2 = nn.Linear(128, num_classes)

        # Dropout
        self.dropout = nn.Dropout(dropout_rate)

        # Batch normalization
        self.bn1 = nn.BatchNorm2d(32)
        self.bn2 = nn.BatchNorm2d(64)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through the network."""
        # First conv block
        x = self.conv1(x)
        x = self.bn1(x)
        x = F.relu(x)
        x = self.pool(x)

        # Second conv block
        x = self.conv2(x)
        x = self.bn2(x)
        x = F.relu(x)
        x = self.pool(x)

        # Flatten
        x = x.view(-1, 64 * 7 * 7)

        # Fully connected layers
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)

        return x

    def get_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extract features before the final classification layer."""
        x = self.conv1(x)
        x = self.bn1(x)
        x = F.relu(x)
        x = self.pool(x)

        x = self.conv2(x)
        x = self.bn2(x)
        x = F.relu(x)
        x = self.pool(x)

        x = x.view(-1, 64 * 7 * 7)
        x = F.relu(self.fc1(x))

        return x
