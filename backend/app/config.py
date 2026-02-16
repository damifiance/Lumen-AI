from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    papers_root: str = str(Path.home() / "Documents")
    database_url: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def get_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        db_path = Path(__file__).parent.parent.parent / "data" / "papers.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{db_path}"


settings = Settings()
