import os
import logging
import pyotp
import boto3
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import sessionmaker, Session, relationship, declarative_base
from passlib.context import CryptContext
from jose import JWTError, jwt

SECRET_KEY = os.getenv("SECRET_KEY", "supersecreto_gratis")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

app = FastAPI(title="Gestión de Usuarios (Auth, Teams & Email)")
logger = logging.getLogger("uvicorn")

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
    full_name = Column(String)
    profile_pic_url = Column(String, nullable=True)
    role = Column(String, default="CITIZEN")
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    last_team_change = Column(DateTime, default=datetime.utcnow)
    is_2fa_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    preferred_2fa_method = Column(String, default="APP")


Base.metadata.create_all(bind=engine)

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


def send_email_code(to_email: str, code: str):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        logger.warning("Credenciales SMTP no configuradas. Imprimiendo en log.")
        logger.info(f"CODE para {to_email}: {code}")
        return

    msg = MIMEMultipart()
    msg['From'] = MAIL_FROM
    msg['To'] = to_email
    msg['Subject'] = "🔐 Tu Código de Acceso Wakanda OS"

    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wakanda OS - Verificación</title>
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background: white;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }}
            .header {{
                background: linear-gradient(90deg, #1a237e 0%, #311b92 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .logo {{
                font-size: 36px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #FFD700;
                letter-spacing: 2px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .code-box {{
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                font-size: 48px;
                font-weight: bold;
                text-align: center;
                padding: 25px;
                border-radius: 15px;
                margin: 30px 0;
                letter-spacing: 10px;
                box-shadow: 0 10px 30px rgba(245, 87, 108, 0.3);
            }}
            .instructions {{
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 30px 0;
                border-left: 5px solid #4CAF50;
            }}
            .footer {{
                background: #1a237e;
                color: #B0BEC5;
                text-align: center;
                padding: 25px;
                font-size: 14px;
            }}
            .badge {{
                display: inline-block;
                background: #FFD700;
                color: #1a237e;
                padding: 8px 20px;
                border-radius: 50px;
                font-weight: bold;
                margin-top: 15px;
                font-size: 18px;
            }}
            .countdown {{
                display: inline-block;
                background: #4CAF50;
                color: white;
                padding: 8px 15px;
                border-radius: 10px;
                margin-top: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">⚡ WAKANDA OS</div>
                <h1 style="margin: 0; font-weight: 300;">Verificación en Dos Pasos</h1>
                <div class="badge">SISTEMA DE ALTA SEGURIDAD</div>
            </div>

            <div class="content">
                <h2 style="color: #1a237e; margin-top: 0;">¡Hola, Guardián!</h2>
                <p>Estás a un paso de acceder al sistema más avanzado del multiverso. Usa el siguiente código para completar tu verificación:</p>

                <div class="code-box">
                    {code}
                </div>

                <div style="text-align: center;">
                    <div class="countdown">⏳ Válido por 30 segundos</div>
                </div>

                <div class="instructions">
                    <h3 style="color: #4CAF50; margin-top: 0;">📋 Instrucciones:</h3>
                    <ol style="margin: 10px 0; padding-left: 20px;">
                        <li>Ingresa este código en la pantalla de verificación</li>
                        <li>No compartas este código con nadie</li>
                        <li>Si no solicitaste este acceso, ignora este mensaje</li>
                    </ol>
                </div>

                <p style="color: #666; font-size: 14px; text-align: center;">
                    🛡️ Este código es generado automáticamente por el sistema de seguridad de Wakanda OS
                </p>
            </div>

            <div class="footer">
                <p style="margin: 0;">© {datetime.now().year} Wakanda OS - Todos los derechos reservados</p>
                <p style="margin: 10px 0 0 0; font-size: 12px;">
                    Protegido por tecnología Vibranium<br>
                    Este es un mensaje automático, por favor no respondas
                </p>
            </div>
        </div>
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
        logger.info(f"Email enviado correctamente a {to_email}")
    except Exception as e:
        logger.error(f"Fallo al enviar email: {e}")
        logger.info(f"FALLBACK CODE para {to_email}: {code}")


@app.post("/register")
def register(email: str = Form(...), password: str = Form(...), full_name: str = Form(...),
             db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "Email ya registrado")

    secret_2fa = pyotp.random_base32()
    new_user = User(
        email=email,
        hashed_password=pwd_context.hash(password),
        full_name=full_name,
        two_factor_secret=secret_2fa
    )
    db.add(new_user)
    db.commit()
    return {"msg": "Usuario creado", "2fa_secret": secret_2fa}


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(401, "Credenciales incorrectas")

    if user.is_2fa_enabled:
        temp_token = create_access_token({"sub": user.email, "type": "pre_auth"})

        totp = pyotp.TOTP(user.two_factor_secret)
        code = totp.now()

        if user.preferred_2fa_method == "EMAIL":
            send_email_code(user.email, code)
            return {"status": "2FA_REQUIRED", "method": "EMAIL", "temp_token": temp_token}
        else:
            return {"status": "2FA_REQUIRED", "method": "APP", "temp_token": temp_token}

    access_token = create_access_token({"sub": user.email, "role": user.role, "type": "full"})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/verify-2fa")
def verify_2fa(code: str, temp_token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(temp_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "pre_auth": raise Exception()
        email = payload.get("sub")
    except:
        raise HTTPException(401, "Token temporal inválido")

    user = db.query(User).filter(User.email == email).first()
    totp = pyotp.TOTP(user.two_factor_secret)

    if not totp.verify(code, valid_window=2):
        raise HTTPException(400, "Código 2FA incorrecto")

    access_token = create_access_token({"sub": user.email, "role": user.role, "type": "full"})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/me/2fa/enable")
def enable_2fa(method: str = "APP", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.is_2fa_enabled = True
    user.preferred_2fa_method = method.upper()
    db.commit()
    return {"msg": f"2FA activado usando {method.upper()}"}


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
            raise HTTPException(400, "Espera 24 horas para cambiar de equipo.")
    user.team_id = team_id
    user.last_team_change = datetime.utcnow()
    db.commit()
    return {"message": "Equipo cambiado"}


@app.get("/me")
def read_users_me(user: User = Depends(get_current_user)):
    return user