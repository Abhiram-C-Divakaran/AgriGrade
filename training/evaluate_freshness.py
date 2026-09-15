from __future__ import annotations

from pathlib import Path

import torch
from sklearn.metrics import classification_report, confusion_matrix
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed" / "apple_freshness" / "test"
WEIGHTS = ROOT / "models" / "apple_freshness_best.pt"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


def main() -> None:
    if not DATA.exists():
        raise FileNotFoundError("Held-out test data is missing. Prepare the dataset first.")
    if not WEIGHTS.exists():
        raise FileNotFoundError("Freshness model weights are missing. Train the model first.")

    checkpoint = torch.load(WEIGHTS, map_location=DEVICE)
    classes = checkpoint["classes"]

    dataset = datasets.ImageFolder(DATA, transform=transform)
    if dataset.classes != classes:
        raise RuntimeError(
            f"Class-order mismatch. Dataset={dataset.classes}, checkpoint={classes}"
        )

    loader = DataLoader(dataset, batch_size=32, shuffle=False, num_workers=0)

    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(classes))
    model.load_state_dict(checkpoint["state_dict"])
    model.to(DEVICE)
    model.eval()

    truth: list[int] = []
    predictions: list[int] = []

    with torch.no_grad():
        for images, labels in loader:
            logits = model(images.to(DEVICE))
            predicted = logits.argmax(dim=1).cpu()
            truth.extend(labels.tolist())
            predictions.extend(predicted.tolist())

    print("Classification report")
    print(classification_report(truth, predictions, target_names=classes, digits=4))
    print("Confusion matrix")
    print(confusion_matrix(truth, predictions))


if __name__ == "__main__":
    main()
