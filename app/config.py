from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://raven:raven@localhost:5432/raven"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    embedding_model_name: str = "all-MiniLM-L6-v2"


settings = Settings()
