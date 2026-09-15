from __future__ import annotations

from typing import Dict, List

DEFECT_WEIGHTS = {
    "bruise": 0.55,
    "dark_spot": 0.35,
    "cut": 0.70,
    "crack": 0.75,
    "discoloration": 0.40,
    "pest_damage": 0.85,
    "rot": 1.60,
    "mold": 2.00,
}


def severity_from_area(area_percent: float) -> str:
    if area_percent < 3:
        return "low"
    if area_percent < 10:
        return "medium"
    return "high"


def grade_from_score(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 75:
        return "B"
    if score >= 55:
        return "C"
    if score >= 30:
        return "D"
    return "Reject"


def recommendation_from_grade(grade: str) -> str:
    return {
        "A": "Premium retail",
        "B": "Normal retail",
        "C": "Processing or quick sale",
        "D": "Poor quality; avoid normal retail",
        "Reject": "Reject for normal retail",
    }[grade]


def calculate_quality_score(defects: List[Dict], freshness_state: str | None = None) -> int:
    score = 100.0
    mold_area = 0.0
    rot_area = 0.0
    severe_area = 0.0

    for defect in defects:
        defect_type = str(defect.get("type", "")).lower()
        area = float(defect.get("affected_area_percent", 0.0))
        confidence = float(defect.get("confidence", 0.0))
        weight = DEFECT_WEIGHTS.get(defect_type, 0.4)

        score -= area * weight * max(confidence, 0.5)

        if defect_type == "mold":
            mold_area += area
        elif defect_type == "rot":
            rot_area += area

        if defect.get("severity") == "high":
            severe_area += area

    # Hard business rules keep severe decay from receiving a retail-grade score.
    if mold_area >= 5 or rot_area >= 10:
        score = min(score, 54)
    if mold_area >= 15 or rot_area >= 30 or severe_area >= 40:
        score = min(score, 29)

    if freshness_state == "decayed":
        score = min(score, 29)
    elif freshness_state == "overripe":
        score = min(score, 74)

    return max(0, min(100, round(score)))
