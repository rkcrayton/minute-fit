"""
Wger exercise library sync.

Fetches the Wger public exercise catalog and upserts into our `exercises`
table keyed by `wger_id`. Runs once on-demand via the admin endpoint.

Wger docs: https://wger.de/api/v2/
"""
import logging
import re
from typing import Optional

import urllib.request
import urllib.error
import json

from sqlalchemy.orm import Session

from models.exercise import Exercise

_log = logging.getLogger(__name__)

_BASE_URL = "https://wger.de/api/v2"
_LANGUAGE_EN = 2   # English
_PAGE_LIMIT = 100
_MAX_PAGES = 50    # safety cap: 100 * 50 = 5,000 exercises

_DESCRIPTION_MAX = 2000

# Map Wger equipment names to our normalized values
_EQUIPMENT_MAP = {
    "none (bodyweight exercise)": "bodyweight",
    "bodyweight": "bodyweight",
    "dumbbell": "dumbbell",
    "sz-bar": "barbell",
    "barbell": "barbell",
    "ez-curl bar": "barbell",
    "pull-up bar": "bodyweight",
    "kettlebell": "kettlebell",
    "swiss ball": "swiss-ball",
    "gym mat": "bodyweight",
    "bench": "bench",
    "incline bench": "bench",
    "cable": "machine",
    "machine": "machine",
    "resistance band": "resistance-band",
}


def _normalize_equipment(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    key = name.strip().lower()
    if key in _EQUIPMENT_MAP:
        return _EQUIPMENT_MAP[key]
    return re.sub(r"\s+", "-", key)


def _strip_html(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    # Replace common block tags with newlines, then drop tags.
    text = re.sub(r"<(br|p|li|div)\b[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(p|li|div)>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    # Collapse whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = text.strip()
    if len(text) > _DESCRIPTION_MAX:
        text = text[:_DESCRIPTION_MAX].rsplit(" ", 1)[0] + "…"
    return text or None


def _derive_difficulty(equipment: Optional[str], muscle_count: int) -> str:
    """Simple heuristic — can be refined later."""
    if equipment in ("machine", "barbell"):
        return "hard" if muscle_count >= 3 else "medium"
    if equipment in ("dumbbell", "kettlebell", "resistance-band"):
        return "medium"
    # bodyweight / none / unknown
    return "easy" if muscle_count <= 1 else "medium"


def _http_get_json(url: str) -> dict:
    """Simple JSON GET using urllib (no extra dep needed)."""
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _fetch_main_image(exercise_base_id: int) -> Optional[str]:
    """Return the URL of the main image for a given exercise-base id, if any."""
    try:
        url = f"{_BASE_URL}/exerciseimage/?exercise_base={exercise_base_id}&is_main=True"
        data = _http_get_json(url)
        results = data.get("results") or []
        if results:
            return results[0].get("image")
    except Exception:
        _log.debug("Failed fetching image for base %s", exercise_base_id, exc_info=True)
    return None


def _extract_translation(entry: dict) -> Optional[dict]:
    """Pick the English translation (language id 2); fall back to first."""
    translations = entry.get("translations") or []
    if not translations:
        return None
    for t in translations:
        if t.get("language") == _LANGUAGE_EN:
            return t
    return translations[0]


def _extract_muscles(entry: dict) -> list[str]:
    muscles = entry.get("muscles") or []
    names: list[str] = []
    for m in muscles:
        name = m.get("name_en") or m.get("name")
        if name:
            names.append(name.strip())
    # Also consider secondary muscles if primary list is short
    if len(names) < 3:
        for m in entry.get("muscles_secondary") or []:
            name = m.get("name_en") or m.get("name")
            if name and name.strip() not in names:
                names.append(name.strip())
    return names


def sync_exercises(db: Session) -> dict:
    """
    Fetch all Wger exercises and upsert by wger_id.
    Returns a count summary.
    """
    inserted = 0
    updated = 0
    skipped = 0
    errors = 0

    next_url: Optional[str] = (
        f"{_BASE_URL}/exerciseinfo/?language={_LANGUAGE_EN}&limit={_PAGE_LIMIT}"
    )

    pages = 0
    while next_url and pages < _MAX_PAGES:
        pages += 1
        try:
            payload = _http_get_json(next_url)
        except Exception:
            _log.exception("Wger fetch failed for %s", next_url)
            errors += 1
            break

        for entry in payload.get("results") or []:
            try:
                wger_id = entry.get("id")
                if wger_id is None:
                    skipped += 1
                    continue

                translation = _extract_translation(entry)
                if not translation or not translation.get("name"):
                    skipped += 1
                    continue

                name = translation["name"].strip()
                description = _strip_html(translation.get("description"))

                muscles = _extract_muscles(entry)
                primary_muscle = muscles[0] if muscles else "General"
                secondary_muscle = muscles[1] if len(muscles) > 1 else None
                tertiary_muscle = muscles[2] if len(muscles) > 2 else None

                equipment_list = entry.get("equipment") or []
                equipment = (
                    _normalize_equipment(equipment_list[0].get("name"))
                    if equipment_list
                    else "bodyweight"
                )

                category_obj = entry.get("category") or {}
                category = (category_obj.get("name") or "").strip().lower() or None

                difficulty = _derive_difficulty(equipment, len(muscles))

                image_url = _fetch_main_image(wger_id)

                existing = (
                    db.query(Exercise).filter(Exercise.wger_id == wger_id).one_or_none()
                )
                if existing is None:
                    # Wger names may collide with existing seed names; upgrade in place
                    existing_by_name = (
                        db.query(Exercise).filter(Exercise.name == name).one_or_none()
                    )
                    if existing_by_name is not None:
                        existing = existing_by_name

                if existing is None:
                    db.add(
                        Exercise(
                            name=name,
                            primary_muscle=primary_muscle,
                            secondary_muscle=secondary_muscle,
                            tertiary_muscle=tertiary_muscle,
                            difficulty=difficulty,
                            wger_id=wger_id,
                            equipment=equipment,
                            category=category,
                            description=description,
                            image_url=image_url,
                        )
                    )
                    inserted += 1
                else:
                    existing.name = name
                    existing.primary_muscle = primary_muscle
                    existing.secondary_muscle = secondary_muscle
                    existing.tertiary_muscle = tertiary_muscle
                    existing.difficulty = difficulty
                    existing.wger_id = wger_id
                    existing.equipment = equipment
                    existing.category = category
                    existing.description = description
                    if image_url:
                        existing.image_url = image_url
                    updated += 1

            except Exception:
                _log.exception("Failed to import Wger entry")
                errors += 1

        # Commit per page to keep the session small
        try:
            db.commit()
        except Exception:
            _log.exception("Wger sync commit failed")
            db.rollback()
            errors += 1

        next_url = payload.get("next")

    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
        "pages": pages,
    }
