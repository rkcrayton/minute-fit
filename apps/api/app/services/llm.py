import logging
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