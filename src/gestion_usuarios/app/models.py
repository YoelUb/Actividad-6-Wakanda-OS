import os
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL.replace("+asyncpg", ""))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    name = Column(String)
    last_name = Column(String)
    profile_pic_url = Column(String, nullable=True)
    role = Column(String, default="CITIZEN")

    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    last_team_change = Column(DateTime, default=datetime.utcnow)

    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    preferred_2fa_method = Column(String, default="APP")

    email_verification_code = Column(String, nullable=True)
    email_code_expires_at = Column(DateTime, nullable=True)
    last_code_sent_at = Column(DateTime, nullable=True)

    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime, nullable=True)

    club_password = Column(String, nullable=True)

class PasswordHistory(Base):
    __tablename__ = "password_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)