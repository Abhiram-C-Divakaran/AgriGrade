from __future__ import annotations

from pathlib import Path
import copy
import random

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

SEED = 42
BATCH_SIZE = 32
EPOCHS = 15
LEARNING_RATE = 1e-4

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed" / "apple_freshness"
OUTPUT = ROOT / "models" / "apple_freshness_best.pt"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

train_transform = transforms.Compose(
    [
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.85, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(
            brightness=0.15,
            contrast=0.15,
            saturation=0.08,
            hue=0.02,
        ),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)

eval_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


def evaluate(model: nn.Module, loader: DataLoader, criterion: nn.Module) -> tuple[float, float]:
    model.eval()
    total = 0
    correct = 0
    running_loss = 0.0

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(DEVICE)
            labels = labels.to(DEVICE)
            logits = model(images)
            loss = criterion(logits, labels)

            running_loss += loss.item() * images.size(0)
            predictions = logits.argmax(dim=1)
            total += labels.size(0)
            correct += (predictions == labels).sum().item()

    return running_loss / max(total, 1), correct / max(total, 1)


def main() -> None:
    required = [DATA / "train", DATA / "val", DATA / "test"]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "Prepared freshness dataset is missing. Run "
            "training/prepare_classifier_dataset.py first. Missing: " + ", ".join(missing)
        )

    train_ds = datasets.ImageFolder(DATA / "train", transform=train_transform)
    val_ds = datasets.ImageFolder(DATA / "val", transform=eval_transform)
    test_ds = datasets.ImageFolder(DATA / "test", transform=eval_transform)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    weights = models.EfficientNet_B0_Weights.DEFAULT
    model = models.efficientnet_b0(weights=weights)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(train_ds.classes))
    model.to(DEVICE)

    class_counts = torch.bincount(torch.tensor(train_ds.targets), minlength=len(train_ds.classes)).float()
    class_weights = class_counts.sum() / torch.clamp(class_counts, min=1)
    class_weights = class_weights / class_weights.mean()

    criterion = nn.CrossEntropyLoss(weight=class_weights.to(DEVICE))
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)

    best_val_accuracy = -1.0
    best_state = None

    print(f"Device: {DEVICE}")
    print(f"Classes: {train_ds.classes}")
    print(f"Training samples: {len(train_ds)}")

    for epoch in range(1, EPOCHS + 1):
        model.train()
        total = 0
        correct = 0
        running_loss = 0.0

        for images, labels in train_loader:
            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            predictions = logits.argmax(dim=1)
            total += labels.size(0)
            correct += (predictions == labels).sum().item()

        train_loss = running_loss / max(total, 1)
        train_accuracy = correct / max(total, 1)
        val_loss, val_accuracy = evaluate(model, val_loader, criterion)

        print(
            f"epoch={epoch:02d} train_loss={train_loss:.4f} "
            f"train_acc={train_accuracy:.4f} val_loss={val_loss:.4f} "
            f"val_acc={val_accuracy:.4f}"
        )

        if val_accuracy > best_val_accuracy:
            best_val_accuracy = val_accuracy
            best_state = copy.deepcopy(model.state_dict())
            torch.save(
                {
                    "state_dict": best_state,
                    "classes": train_ds.classes,
                    "architecture": "efficientnet_b0",
                    "seed": SEED,
                    "best_val_accuracy": best_val_accuracy,
                },
                OUTPUT,
            )
            print(f"Saved best checkpoint: {OUTPUT}")

    if best_state is None:
        raise RuntimeError("Training completed without producing a checkpoint.")

    model.load_state_dict(best_state)
    test_loss, test_accuracy = evaluate(model, test_loader, criterion)
    print(f"Best validation accuracy: {best_val_accuracy:.4f}")
    print(f"Held-out test loss: {test_loss:.4f}")
    print(f"Held-out test accuracy: {test_accuracy:.4f}")


if __name__ == "__main__":
    main()
