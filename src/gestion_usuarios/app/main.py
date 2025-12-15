import os
import logging
import boto3
import smtplib
import random
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel

SECRET_KEY = os.getenv("SECRET_KEY", "supersecreto_gratis")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET = os.getenv("MINIO_SECRET_KEY", "minioadmin")

s3_client = boto3.client(
    's3',
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS,
    aws_secret_access_key=MINIO_SECRET
)

app = FastAPI(title="Gestión de Usuarios")
logger = logging.getLogger("uvicorn")

origins = ["http://localhost:3000", "http://localhost:5173", "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DATABASE_URL")
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

Base.metadata.create_all(bind=engine)

class ClubVerify(BaseModel):
    password: str

def init_teams():
    db = SessionLocal()
    try:
        teams_data = [
            {"id": 1, "name": "Rick & Morty Club", "description": "Exploradores del multiverso"},
            {"id": 2, "name": "Pokémon League", "description": "Entrenadores y maestros"},
            {"id": 3, "name": "Hogwarts School", "description": "Magia y hechicería"}
        ]
        for t_data in teams_data:
            exists = db.query(Team).filter(Team.id == t_data["id"]).first()
            if not exists:
                new_team = Team(id=t_data["id"], name=t_data["name"], description=t_data["description"])
                db.add(new_team)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

init_teams()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.email == email).first()
    if not user: raise HTTPException(status_code=401)
    return user

def send_verification_email(to_email: str, code: str):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        logger.warning(f"CODE para {to_email}: {code}")
        return

    msg = MIMEMultipart()
    msg['From'] = MAIL_FROM
    msg['To'] = to_email
    msg['Subject'] = "Codigo de Verificacion - Wakanda OS"

    body = f"""
    <html>
      <body>
        <h2>Wakanda OS</h2>
        <p>Tu código de seguridad es:</p>
        <h1>{code}</h1>
        <p>Válido por 20 minutos.</p>
      </body>
    </html>
    """
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
        server.starttls()
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(MAIL_FROM, to_email, text)
        server.quit()
    except Exception as e:
        logger.error(f"Fallo al enviar email: {e}")
        logger.info(f"FALLBACK CODE para {to_email}: {code}")

def send_account_verified_email(to_email: str, club_password: str):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        logger.warning(f"Cuenta verificada. Club Password: {club_password}")
        return

    msg = MIMEMultipart()
    msg['From'] = MAIL_FROM
    msg['To'] = to_email
    msg['Subject'] = "Bienvenido al Club VIP Wakanda"

    body = f"""
    <html>
      <body>
        <h2>¡Cuenta Verificada!</h2>
        <p>Tu contraseña única para el Club VIP es:</p>
        <h1 style="color: #bd00ff">{club_password}</h1>
        <p>Guárdala en lugar seguro.</p>
      </body>
    </html>
    """
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
        server.starttls()
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(MAIL_FROM, to_email, text)
        server.quit()
    except Exception as e:
        logger.error(f"Fallo al enviar email VIP: {e}")

@app.post("/register")
def register(
        email: str = Form(...),
        password: str = Form(...),
        name: str = Form(...),
        last_name: str = Form(...),
        team_id: int = Form(None),
        db: Session = Depends(get_db)
):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email ya registrado")

    if not re.match(r"^[a-zA-ZÀ-ÿ\s]+$", name) or not re.match(r"^[a-zA-ZÀ-ÿ\s]+$", last_name):
        raise HTTPException(400, "Nombre y Apellidos solo pueden contener letras")

    if team_id:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise HTTPException(400, f"El equipo con ID {team_id} no existe.")

    verification_code = str(random.randint(100000, 999999))
    club_password = f"WAKANDA-{random.randint(1000, 9999)}-VIP"

    new_user = User(
        email=email,
        hashed_password=pwd_context.hash(password),
        name=name,
        last_name=last_name,
        team_id=team_id,
        is_verified=False,
        email_verification_code=verification_code,
        email_code_expires_at=datetime.utcnow() + timedelta(minutes=20),
        last_code_sent_at=datetime.utcnow(),
        club_password=club_password,
        last_team_change=datetime.utcnow() - timedelta(days=1)
    )
    db.add(new_user)
    db.commit()

    send_verification_email(email, verification_code)

    return {"msg": "Usuario creado. Verifica tu cuenta con el código enviado al correo."}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(401, "Credenciales incorrectas")

    if not user.is_verified:
        if user.email_code_expires_at and datetime.utcnow() > user.email_code_expires_at:
            return {"status": "VERIFICATION_REQUIRED", "msg": "Código expirado. Solicita uno nuevo."}
        return {"status": "VERIFICATION_REQUIRED", "msg": "Cuenta no verificada. Revisa tu correo."}

    access_token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "status": "LOGIN_SUCCESS"}

@app.post("/verify-account")
def verify_account(email: str = Form(...), code: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user: raise HTTPException(404, "Usuario no encontrado")

    if user.is_verified: return {"msg": "La cuenta ya estaba verificada"}

    if user.email_verification_code != code: raise HTTPException(400, "Código incorrecto")

    if user.email_code_expires_at and datetime.utcnow() > user.email_code_expires_at:
        raise HTTPException(400, "El código ha expirado")

    user.is_verified = True
    user.email_verification_code = None
    user.verification_date = datetime.utcnow()
    db.commit()

    send_account_verified_email(user.email, user.club_password)

    access_token = create_access_token({"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "msg": "Cuenta verificada"}

@app.post("/resend-code")
def resend_code(email: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user: raise HTTPException(404, "Usuario no encontrado")

    if user.last_code_sent_at and datetime.utcnow() < user.last_code_sent_at + timedelta(minutes=15):
        raise HTTPException(429, "Espera 15 minutos para reenviar.")

    new_code = str(random.randint(100000, 999999))
    user.email_verification_code = new_code
    user.email_code_expires_at = datetime.utcnow() + timedelta(minutes=20)
    user.last_code_sent_at = datetime.utcnow()
    db.commit()

    send_verification_email(user.email, new_code)
    return {"msg": "Nuevo código enviado"}

@app.post("/clubs/verify")
def verify_club(data: ClubVerify, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.club_password or user.club_password != data.password:
        raise HTTPException(status_code=401, detail="⛔ Contraseña de Club incorrecta.")

    if not user.team_id:
        raise HTTPException(status_code=403, detail="⚠️ No tienes un equipo asignado.")

    team_map = {1: "rickmorty", 2: "pokemon", 3: "hogwarts"}

    view = team_map.get(user.team_id)
    return {"status": "ok", "view": view}

@app.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    bucket_name = "avatars"
    try:
        s3_client.create_bucket(Bucket=bucket_name)
    except:
        pass
    file_key = f"{user.id}_{file.filename}"
    s3_client.upload_fileobj(file.file, bucket_name, file_key, ExtraArgs={'ContentType': file.content_type})
    url = f"http://localhost:9000/{bucket_name}/{file_key}"
    user.profile_pic_url = url
    db.commit()
    return {"url": url}

@app.post("/me/team")
def change_team(team_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.last_team_change:
        diff = datetime.utcnow() - user.last_team_change
        if diff.total_seconds() < 86400:
            raise HTTPException(400, "Espera 24 horas.")

    team = db.query(Team).filter(Team.id == team_id).first()
    if not team: raise HTTPException(404, "Equipo no encontrado")

    user.team_id = team_id
    user.last_team_change = datetime.utcnow()
    db.commit()
    return {"message": "Equipo cambiado"}

@app.get("/me")
def read_users_me(user: User = Depends(get_current_user)):
    return user