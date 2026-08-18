import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

from app.config import (
    CHECKPOINT_PATH, CLASSES_PATH, INPUT_SIZE, NORMALIZE_MEAN, NORMALIZE_STD
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


with open(CLASSES_PATH) as f:
    classes = [line.strip() for line in f.readlines()]


model = models.resnet50(weights=None)
num_features = model.fc.in_features
model.fc = nn.Sequential(
    nn.Dropout(p=0.4),
    nn.Linear(num_features, len(classes))
)

checkpoint = torch.load(CHECKPOINT_PATH, map_location=device, weights_only=False)



if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
    state_dict  = checkpoint["model_state_dict"]
    idx_to_class = checkpoint.get("idx_to_class", {i: c for i, c in enumerate(classes)})
    top1_acc     = checkpoint.get("top1_acc", "N/A")
else:
    
    state_dict   = checkpoint
    idx_to_class = {i: c for i, c in enumerate(classes)}
    top1_acc     = "N/A"

model.load_state_dict(state_dict, strict=False)
model = model.to(device)
model.eval()

print(f"Modèle chargé sur {device} | {len(classes)} classes | "
      f"Top-1 entraînement: {top1_acc}")


transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(INPUT_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
])


def predict_image(image_bytes: bytes, top_k: int = 5):
    """Prend les bytes bruts d'une image uploadée et retourne les top_k prédictions."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    x = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            outputs = model(x)
        probs = torch.softmax(outputs, dim=1)
        top_probs, top_idxs = probs.topk(min(top_k, len(classes)), dim=1)

    results = [
        {"class_name": classes[idx], "confidence": prob.item()}
        for prob, idx in zip(top_probs[0], top_idxs[0])
    ]
    return results