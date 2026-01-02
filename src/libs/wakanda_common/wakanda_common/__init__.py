import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base


def get_db_engine(url):
    return create_async_engine(url, echo=True)

Base = declarative_base()

def get_db_session_maker(engine):
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)