import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

ENV_PATH = Path("C:/env/Appeal Product/appealio.env")
load_dotenv(ENV_PATH)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "480"))
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    DB_HOST = os.getenv("HOST")
    DB_PORT = os.getenv("PORT")
    DB_USER = os.getenv("USER")
    DB_PASSWORD = os.getenv("PASSWORD")
    DB_NAME = os.getenv("APPEALIO_DB_NAME")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg://{quote_plus(DB_USER)}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
