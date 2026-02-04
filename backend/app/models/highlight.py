import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Highlight(Base):
    __tablename__ = "highlights"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    paper_path: Mapped[str] = mapped_column(String, index=True)
    content_text: Mapped[str] = mapped_column(Text, default="")
    position_json: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String, default="#FFFF00")
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
