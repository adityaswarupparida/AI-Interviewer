import json

from livekit import api

from backend.config import settings


async def create_interview_room(
    room_name: str,
    interview_id: str,
    role: str,
    job_description: str,
    skills_to_cover: list[str],
    candidate_name: str,
) -> None:
    """Create a LiveKit room pre-loaded with interview metadata."""
    lk = api.LiveKitAPI(
        url=settings.LIVEKIT_URL,
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )

    metadata = json.dumps({
        "interview_id": interview_id,
        "role": role,
        "job_description": job_description,
        "skills_to_cover": skills_to_cover,
        "candidate_name": candidate_name,
    })

    await lk.room.create_room(
        api.CreateRoomRequest(
            name=room_name,
            metadata=metadata,
            empty_timeout=300,   # auto-close if empty for 5 minutes
            max_participants=3,  # candidate + agent + optional observer
        )
    )
    await lk.aclose()


def generate_candidate_token(room_name: str, participant_name: str) -> str:
    """Generate a short-lived LiveKit JWT for the candidate to join."""
    token = api.AccessToken(
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )
    token.with_identity(participant_name)
    token.with_name(participant_name)
    token.with_grants(
        api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
    )
    return token.to_jwt()
