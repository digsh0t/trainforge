# TrainForge Setup Guide

Train ML models in the cloud using your own GitHub Actions and AWS account. No third-party access required.

## Quick Start (5 minutes)

### Step 1: Add AWS Credentials to GitHub Secrets

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name             | Description         | Example                                    |
| ----------------------- | ------------------- | ------------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | Your AWS access key | `AKIAIOSFODNN7EXAMPLE`                     |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION`            | AWS region to use   | `us-east-1`                                |

**Optional:** Add `TRAINFORGE_WEBHOOK_URL` if you want real-time status updates in the TrainForge dashboard.

### Step 2: Add the Workflow File

Copy the workflow template to your repository:

```
your-repo/
├── .github/
│   └── workflows/
│       └── trainforge.yml    ← Copy the template here
├── train.py                   ← Your training script
├── requirements.txt           ← Your dependencies
└── ...
```

Download the template: [trainforge.yml](https://trainforge.dev/workflow-template)

Or create it manually - see the full template at the bottom of this guide.

### Step 3: Run Your Training

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select **"TrainForge ML Training"** from the left sidebar
4. Click **"Run workflow"**
5. Configure your options:
   - **Template**: Choose your compute (CPU/GPU)
   - **Training script**: Path to your training file
   - **Max runtime**: Auto-shutdown time
6. Click **"Run workflow"**

That's it! 🎉

---

## Available Templates

| Template    | Specs                  | Cost\*    | Best For                         |
| ----------- | ---------------------- | --------- | -------------------------------- |
| `cpu-small` | 2 vCPU, 4GB RAM        | ~$0.05/hr | Testing, small datasets          |
| `cpu-large` | 8 vCPU, 32GB RAM       | ~$0.20/hr | Data preprocessing, CPU training |
| `gpu-t4`    | NVIDIA T4, 16GB VRAM   | ~$0.75/hr | Most ML training                 |
| `gpu-a10`   | NVIDIA A10G, 24GB VRAM | ~$1.50/hr | Large models, fast training      |

\*Prices are approximate AWS on-demand rates.

---

## Project Structure

Your repository should have:

```
your-ml-project/
├── .github/
│   └── workflows/
│       └── trainforge.yml    # The workflow file
├── train.py                   # Your training script (entry point)
├── requirements.txt           # Python dependencies
├── src/                       # Your source code (optional)
│   ├── model.py
│   └── data.py
└── results/                   # Output directory (created automatically)
    └── model.pt               # Your trained model
```

---

## Training Script Requirements

Your training script should:

1. **Read data** from the repository or download it
2. **Save results** to a `results/` directory or as `.pt`/`.pth`/`.h5` files
3. **Print progress** to stdout (appears in GitHub Actions logs)

### Example: `train.py`

```python
import torch
import torch.nn as nn
from pathlib import Path

# Simple example model
model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Linear(128, 10)
)

# Your training logic here
print("🚀 Starting training...")
# ... training code ...
print("✅ Training complete!")

# Save the model
Path("results").mkdir(exist_ok=True)
torch.save(model.state_dict(), "results/model.pt")
print(f"💾 Model saved to results/model.pt")
```

---

## Accessing Results

After training completes:

1. Go to the **Actions** tab in your repository
2. Click on the completed workflow run
3. Scroll down to **Artifacts**
4. Download **training-results**

Your trained model and outputs will be in the zip file.

---

## Monitoring

### GitHub Actions Logs

- Real-time logs in the Actions tab
- Each step shows progress

### TrainForge Dashboard (Optional)

Add your webhook URL to get:

- Real-time status updates
- Cost tracking
- Historical runs

---

## Cost Control

### Auto-Shutdown

The `max_runtime_hours` input automatically terminates training to prevent runaway costs.

### Cleanup

The workflow automatically destroys AWS resources after training, whether it succeeds or fails.

### AWS Budget Alerts

We recommend setting up [AWS Budget Alerts](https://aws.amazon.com/aws-cost-management/aws-budgets/) as a safety net.

---

## Troubleshooting

### "AWS credentials not found"

- Check that `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in repository secrets
- Ensure the IAM user has EC2 permissions

### "Training script not found"

- Check the path in the workflow input
- Make sure the file is committed to the repository

### "Out of memory"

- Try a larger template (e.g., `gpu-a10` instead of `gpu-t4`)
- Reduce batch size in your training script

### "Instance failed to start"

- Check your AWS region has the instance type available
- GPU instances may need quota increases

---

## AWS IAM Policy

For minimum permissions, create an IAM user with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:DescribeSecurityGroups",
        "ec2:CreateKeyPair",
        "ec2:DeleteKeyPair",
        "ec2:DescribeKeyPairs",
        "ec2:CreateTags",
        "ec2:DescribeImages",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## FAQ

**Q: Do I need to give TrainForge access to my GitHub?**  
A: No! You just paste your repository URL. We only check if the workflow file exists (public API).

**Q: Where does the training run?**  
A: On your own AWS account, using GitHub Actions as the orchestrator.

**Q: How much does it cost?**  
A: You pay AWS directly for compute time. GitHub Actions minutes are free for public repos, or use your existing allocation.

**Q: Is my code secure?**  
A: Your code stays in your repository and your AWS account. TrainForge never sees it.

**Q: Can I use my own Docker image?**  
A: Coming soon! For now, the workflow installs dependencies from requirements.txt.

---

## Support

- 📖 [Documentation](https://trainforge.dev/docs)
- 💬 [Discord Community](https://discord.gg/trainforge)
- 🐛 [Report Issues](https://github.com/trainforge/trainforge/issues)
