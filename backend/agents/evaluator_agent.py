"""
Post-interview evaluator agent.
Called by Celery after the interview ends — analyzes the full transcript
and produces a structured JSON report using Gemini.
"""
import json
import logging

from google import genai
from google.genai import types

from backend.config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# ── Prompts ───────────────────────────────────────────────────────────────────

_SKILLS_PROMPT = """\
Extract exactly 8-10 key technical and soft skills to assess in an interview \
for a {role} position based on this job description. Return a JSON array of strings only.

Job Description:
{job_description}"""

_EVALUATION_PROMPT = """\
You are a senior hiring manager with 15 years of experience evaluating engineering candidates.
Analyze the interview transcript below carefully and return ONLY a valid JSON object.

ROLE: {role}
CANDIDATE: {candidate_name}

JOB DESCRIPTION:
{job_description}

SKILLS ASSESSED: {skills_to_cover}

FULL INTERVIEW TRANSCRIPT:
{transcript}

Return this exact JSON structure — no markdown, no explanation, just JSON:

{{
  "candidate_name": "{candidate_name}",
  "role_applied": "{role}",
  "overall_score": <integer 1-10>,
  "role_eligibility": "<Strong Hire | Hire | No Hire | Strong No Hire>",
  "recommendation": "<2-3 sentence hiring recommendation>",

  "skill_scores": [
    {{
      "skill": "<skill name>",
      "score": <integer 1-10>,
      "evidence": "<direct quote or paraphrase from the interview>"
    }}
  ],

  "competency_scores": {{
    "communication":   {{ "score": <1-10>, "notes": "<specific observation>" }},
    "problem_solving": {{ "score": <1-10>, "notes": "<specific observation>" }},
    "technical_depth": {{ "score": <1-10>, "notes": "<specific observation>" }},
    "cultural_fit":    {{ "score": <1-10>, "notes": "<specific observation>" }},
    "leadership":      {{ "score": <1-10>, "notes": "<specific observation>" }}
  }},

  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],

  "areas_for_improvement": [
    {{
      "area": "<skill or competency>",
      "current_level": "<Beginner | Intermediate | Advanced>",
      "why_important": "<why this matters for the role>",
      "resources": ["<book/course/link>", "<resource 2>"],
      "timeline": "<e.g. 2-3 months with consistent practice>"
    }}
  ],

  "red_flags": ["<concerning observation from interview>"],
  "green_flags": ["<strong positive signal>"],
  "interview_quality_notes": "<overall notes on confidence, clarity, and depth>"
}}"""


# ── Public functions ──────────────────────────────────────────────────────────

def extract_skills_from_jd(job_description: str, role: str) -> list[str]:
    """Use Gemini to pull 8-10 skills to assess from the job description."""
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
        contents=_SKILLS_PROMPT.format(role=role, job_description=job_description),
    )
    skills = json.loads(response.text)
    logger.info("Extracted %d skills for role '%s'", len(skills), role)
    return skills


def generate_report(
    transcript: str,
    role: str,
    job_description: str,
    candidate_name: str,
    skills_to_cover: list[str],
) -> dict:
    """Run evaluation against the full interview transcript. Returns parsed report dict."""
    prompt = _EVALUATION_PROMPT.format(
        transcript=transcript,
        role=role,
        candidate_name=candidate_name,
        job_description=job_description,
        skills_to_cover=", ".join(skills_to_cover),
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.3,  # low temp for consistent structured output
        ),
        contents=prompt,
    )

    report = json.loads(response.text)
    logger.info(
        "Report generated for '%s' — score: %s, eligibility: %s",
        candidate_name,
        report.get("overall_score"),
        report.get("role_eligibility"),
    )
    return report
