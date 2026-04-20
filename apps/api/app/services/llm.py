import json
import logging
from typing import Any

from config import settings

_log = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are a certified fitness and health advisor integrated into a body composition "
    "analysis app. Given body scan results, provide a personalized analysis.\n\n"
    "IMPORTANT formatting rules:\n"
    "- Respond in plain text only. Do NOT use markdown, bold, italics, headers, or bullet points.\n"
    "- Structure your response in short paragraphs separated by blank lines.\n"
    "- For next steps, use numbered lines like:\n"
    "  1. First step here\n"
    "  2. Second step here\n"
    "  3. Third step here\n\n"
    "Content guidelines:\n"
    "- Start with a brief summary of what the results mean in plain language.\n"
    "- Mention key strengths.\n"
    "- Mention areas to improve.\n"
    "- End with 2-3 numbered actionable next steps.\n"
    "- Be encouraging, concise (under 200 words), and avoid medical diagnoses.\n"
    "- Do not repeat the raw numbers back — the user can already see them.\n"
    "- Focus on interpretation and practical advice."
)


def generate_scan_insights(
    scan_data: dict,
    user_profile: dict,
) -> str | None:
    """
    Call Gemini API to generate personalized insights from scan results.
    Returns the insight text, or None if the service is unavailable.
    """
    if not settings.GEMINI_API_KEY:
        _log.warning("GEMINI_API_KEY not set — skipping AI insights")
        return None

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        bc = scan_data.get("body_composition", {})
        ha = scan_data.get("health_assessment", {})
        measurements = scan_data.get("measurements", {})

        user_context = (
            f"User profile: {user_profile.get('age', 'N/A')} year old "
            f"{user_profile.get('gender', 'person')}, "
            f"{user_profile.get('height', 'N/A')} inches tall, "
            f"{user_profile.get('weight', 'N/A')} lbs. "
            f"Fitness goal: {user_profile.get('fitness_goal', 'general fitness')}."
        )

        scan_context = (
            f"Body composition results:\n"
            f"- BMI: {bc.get('bmi', 'N/A')}\n"
            f"- Body fat: {bc.get('body_fat_percentage', 'N/A')}%\n"
            f"- Fat mass: {bc.get('fat_mass_lbs', 'N/A')} lbs\n"
            f"- Lean mass: {bc.get('lean_mass_lbs', 'N/A')} lbs\n"
            f"- Waist-to-hip ratio: {bc.get('waist_to_hip_ratio', 'N/A')}\n"
            f"- Health category: {ha.get('category', 'N/A')} ({ha.get('risk_level', 'N/A')} risk)\n\n"
            f"Key measurements (inches): "
            + ", ".join(f"{k}: {v}" for k, v in measurements.items())
        )

        prompt = f"{user_context}\n\n{scan_context}"

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
            ),
        )
        return response.text

    except Exception:
        _log.exception("Gemini call failed — returning no insights")
        return None


# ---------------------------------------------------------------------------
# Workout plan generation
# ---------------------------------------------------------------------------

_PLAN_SYSTEM_PROMPT = (
    "You are an expert fitness coach generating a personalized weekly workout plan.\n\n"
    "CRITICAL rules:\n"
    "- Output JSON only, matching the provided schema exactly.\n"
    "- Only use exercise_id values from the AVAILABLE_EXERCISES list. Any other id is invalid.\n"
    "- Honor the user's equipment preferences — do not include exercises whose equipment is excluded.\n"
    "- Honor the user's 'avoid' free-text restrictions (e.g. bad knees → skip jumping/deep knee bends).\n"
    "- Respect the requested days_per_week — mark the other days as rest (empty list).\n"
    "- Balance muscle groups across workout days (don't put all chest on one day, etc.).\n"
    "- Each exercise entry MUST include: exercise_id (int), times_per_day (1-6), duration_seconds (15-300), order (0+).\n"
    "- times_per_day × duration_seconds roughly totals the minutes_per_session target when summed across a day.\n"
    "- Adapt intensity to the user's age, body fat, and fitness_goal.\n"
    "- title: short motivating label (≤60 chars). subtitle: 1-line description (≤120 chars).\n"
    "- Use lowercase day keys: monday, tuesday, wednesday, thursday, friday, saturday, sunday — all seven must be present."
)


_PLAN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "subtitle": {"type": "string"},
        "schedule": {
            "type": "object",
            "properties": {
                day: {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "exercise_id": {"type": "integer"},
                            "times_per_day": {"type": "integer"},
                            "duration_seconds": {"type": "integer"},
                            "order": {"type": "integer"},
                        },
                        "required": [
                            "exercise_id",
                            "times_per_day",
                            "duration_seconds",
                            "order",
                        ],
                    },
                }
                for day in [
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                ]
            },
            "required": [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ],
        },
    },
    "required": ["title", "subtitle", "schedule"],
}


def generate_workout_plan(
    user_profile: dict,
    prefs: dict,
    available_exercises: list[dict],
) -> dict | None:
    """
    Call Gemini to compose a weekly workout plan tailored to the user and preferences.

    Returns a dict with title / subtitle / schedule, or None on failure.
    """
    if not settings.GEMINI_API_KEY:
        _log.warning("GEMINI_API_KEY not set — skipping workout plan generation")
        return None

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Keep the exercise list compact in the prompt
        compact_exercises = [
            {
                "id": e["id"],
                "name": e["name"],
                "muscle": e.get("primary_muscle"),
                "equipment": e.get("equipment"),
                "difficulty": e.get("difficulty"),
            }
            for e in available_exercises
        ]

        user_ctx = (
            f"USER PROFILE:\n"
            f"- age: {user_profile.get('age', 'N/A')}\n"
            f"- gender: {user_profile.get('gender', 'N/A')}\n"
            f"- height (in): {user_profile.get('height', 'N/A')}\n"
            f"- weight (lbs): {user_profile.get('weight', 'N/A')}\n"
            f"- fitness_goal: {user_profile.get('fitness_goal', 'general fitness')}\n"
            f"- body_fat_percentage: {user_profile.get('body_fat_percentage', 'N/A')}"
        )

        prefs_ctx = (
            f"PREFERENCES:\n"
            f"- days_per_week: {prefs.get('days_per_week')}\n"
            f"- minutes_per_session: {prefs.get('minutes_per_session')}\n"
            f"- equipment allowed: {prefs.get('equipment') or 'any'}\n"
            f"- avoid: {prefs.get('avoid') or 'none'}\n"
            f"- goal override: {prefs.get('goal') or 'none'}"
        )

        ex_ctx = "AVAILABLE_EXERCISES (JSON):\n" + json.dumps(compact_exercises)

        prompt = f"{user_ctx}\n\n{prefs_ctx}\n\n{ex_ctx}\n\nReturn the weekly plan JSON."

        config = genai.types.GenerateContentConfig(
            system_instruction=_PLAN_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=_PLAN_SCHEMA,
        )

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=config,
        )

        text = response.text or ""
        if not text.strip():
            _log.warning("Gemini returned empty plan text")
            return None

        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            _log.warning("Gemini plan JSON was not an object")
            return None
        return parsed

    except Exception:
        _log.exception("Gemini workout-plan call failed")
        return None