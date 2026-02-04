import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Paper(Base):
    __tablename__ = "papers"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    file_path: Mapped[str] = mapped_column(String, unique=True)
    title: Mapped[str] = mapped_column(String, default="")
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    last_opened: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
