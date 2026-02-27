from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    LIVEKIT_URL: str
    LIVEKIT_API_KEY: str
    LIVEKIT_API_SECRET: str

    # Update this in your .env — format: postgresql+psycopg2://user:password@host:5432/dbname
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ai_intrvwr"
    REDIS_URL: str = "redis://localhost:6379/0"

    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Auth
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    # Langfuse observability (optional — leave blank to disable)
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    LANGFUSE_BASE_URL: str = ""  # alias — if set, overrides LANGFUSE_HOST

    class Config:
        env_file = ".env"


settings = Settings()
