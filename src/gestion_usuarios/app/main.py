import os
import logging
import boto3
import smtplib
import random
import re
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

try:
    from app.models import Base, User, Team, SessionLocal, engine, PasswordHistory
    from app.schemas import ClubVerify, UserUpdate, RecoverRequest, RecoverConfirm
except ImportError:
    from .models import Base, User, Team, SessionLocal, engine, PasswordHistory
    from .schemas import ClubVerify, UserUpdate, RecoverRequest, RecoverConfirm

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "supersecreto_gratis"

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

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


def init_admin():
    db = SessionLocal()
    try:
        admin_email = "admin@wakanda.es"
        exists = db.query(User).filter(User.email == admin_email).first()
        if not exists:
            admin_user = User(
                email=admin_email,
                hashed_password=pwd_context.hash("admin123"),
                name="T'Challa",
                last_name="King",
                role="ADMIN",
                is_verified=True,
                team_id=1,
                club_password="WAKANDA-FOREVER"
            )
            db.add(admin_user)
            db.commit()
            print(f"ADMIN CREADO: {admin_email}")
    except Exception as e:
        print(f"Error creando admin: {e}")
    finally:
        db.close()


init_teams()
init_admin()


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


def send_email(to_email: str, subject: str, body: str):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        return

    msg = MIMEMultipart()
    msg['From'] = MAIL_FROM
    msg['To'] = to_email
    msg['Subject'] = subject
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


def send_verification_email(to_email: str, code: str):
    body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #667eea; text-align: center;">🛡️ Verificación Wakanda OS</h2>
            <p style="text-align: center; color: #555;">Tu código de seguridad es:</p>
            <div style="background: #f0f4f8; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #333; border-radius: 5px; margin: 20px 0;">
                {code}
            </div>
            <p style="text-align: center; color: #888; font-size: 12px;">Válido por 20 minutos. No lo compartas.</p>
        </div>
    </body>
    </html>
    """
    send_email(to_email, "Codigo de Verificacion - Wakanda OS", body)


def send_password_recovery_email(to_email: str, code: str):
    body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #ff4757; text-align: center;">🔑 Recuperación de Contraseña</h2>
            <p style="text-align: center; color: #555;">Usa este código para restablecer tu contraseña:</p>
            <div style="background: #fff0f1; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #ff4757; border-radius: 5px; margin: 20px 0; border: 1px dashed #ff4757;">
                {code}
            </div>
            <p style="text-align: center; color: #888; font-size: 12px;">Si no has solicitado esto, ignora este correo.</p>
        </div>
    </body>
    </html>
    """
    send_email(to_email, "Recuperacion de Acceso - Wakanda OS", body)


def send_account_verified_email(to_email: str, club_password: str):
    body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; padding: 20px; color: white;">
        <div style="max-width: 600px; margin: 0 auto; background: #2d2d2d; padding: 30px; border-radius: 15px; border: 2px solid #00eaff;">
            <h2 style="color: #00eaff; text-align: center; text-transform: uppercase;">🚀 ¡Acceso Concedido!</h2>
            <p style="text-align: center;">Bienvenido a la ciudadanía oficial de Wakanda.</p>
            <div style="margin: 30px 0; text-align: center;">
                <p style="margin-bottom: 10px; color: #bd00ff;">TU CONTRASEÑA VIP DE CLUB:</p>
                <div style="font-family: monospace; font-size: 28px; background: rgba(189,0,255,0.1); padding: 15px; border: 1px dashed #bd00ff; border-radius: 8px;">
                    {club_password}
                </div>
            </div>
            <p style="text-align: center; color: #aaa; font-size: 14px;">Usa esta contraseña para acceder a los paneles secretos.</p>
        </div>
    </body>
    </html>
    """
    send_email(to_email, "Bienvenido al Club VIP Wakanda", body)


def send_team_change_email(to_email: str, team_name: str, club_password: str):
    body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #fff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #eee; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333; text-align: center;">🔄 Cambio de Equipo Confirmado</h2>
            <p style="text-align: center; font-size: 18px;">Ahora perteneces a: <strong>{team_name}</strong></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="text-align: center; color: #555;">Te recordamos tu contraseña de acceso al Club:</p>
            <h3 style="text-align: center; color: #d63384; font-family: monospace; font-size: 24px;">{club_password}</h3>
        </div>
    </body>
    </html>
    """
    send_email(to_email, f"Nuevo Equipo: {team_name}", body)


def send_password_changed_email(to_email: str):
    body = """
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; border-left: 5px solid #28a745; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #28a745; text-align: center;">✅ Contraseña Actualizada</h2>
            <p style="text-align: center; color: #333; font-size: 16px;">
                Te informamos que la contraseña de tu cuenta Wakanda OS ha sido modificada correctamente.
            </p>
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; color: #1b5e20; text-align: center;">
                Si tú realizaste este cambio, puedes ignorar este mensaje.
            </div>
            <p style="text-align: center; color: #888; font-size: 12px;">
                Si NO fuiste tú, contacta inmediatamente con seguridad.
            </p>
        </div>
    </body>
    </html>
    """
    send_email(to_email, "Seguridad Wakanda OS - Contraseña Modificada", body)


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
        s3_client.head_bucket(Bucket=bucket_name)
    except:
        try:
            s3_client.create_bucket(Bucket=bucket_name)
        except Exception as e:
            logger.error(f"Error creando bucket: {e}")

    try:
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicRead",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                }
            ]
        }
        s3_client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
    except Exception as e:
        logger.warning(f"No se pudo establecer política pública: {e}")

    file_key = f"{user.id}_{file.filename}"
    try:
        s3_client.upload_fileobj(
            file.file,
            bucket_name,
            file_key,
            ExtraArgs={'ContentType': file.content_type}
        )
    except Exception as e:
        raise HTTPException(500, f"Error al subir imagen a MinIO: {e}")

    url = f"http://localhost:30009/{bucket_name}/{file_key}"
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

    send_team_change_email(user.email, team.name, user.club_password)

    return {"message": "Equipo cambiado"}


@app.get("/me")
def read_users_me(user: User = Depends(get_current_user)):
    return user


@app.get("/users")
def get_all_users(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Requiere privilegios de administrador")
    return db.query(User).all()


@app.put("/users/{user_id}")
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="⛔ Prohibido: Solo puedes modificar tu propio perfil.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user_data.username:
        user.email = user_data.username

    if user_data.password:
        if not re.match(r"^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.,]).{8,}$", user_data.password):
            raise HTTPException(400, "La contraseña debe tener 8+ caracteres, mayúscula, número y especial")

        if pwd_context.verify(user_data.password, user.hashed_password):
            raise HTTPException(400, "La nueva contraseña no puede ser igual a la anterior")

        user.hashed_password = pwd_context.hash(user_data.password)

    db.commit()
    return {"message": "Usuario actualizado correctamente"}


@app.post("/recover/request")
def request_password_recovery(data: RecoverRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {"message": "Si el correo existe, se enviará un código."}

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="⚠️ Tu cuenta no está verificada. Revisa tu correo de bienvenida para activar la cuenta antes de recuperar la contraseña."
        )

    recovery_code = str(random.randint(100000, 999999))
    user.email_verification_code = recovery_code
    user.email_code_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    send_password_recovery_email(data.email, recovery_code)
    return {"message": "Código de recuperación enviado."}


@app.post("/recover/confirm")
def confirm_password_recovery(data: RecoverConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user.email_verification_code != data.code:
        raise HTTPException(status_code=400, detail="Código incorrecto")

    if user.email_code_expires_at and datetime.utcnow() > user.email_code_expires_at:
        raise HTTPException(status_code=400, detail="El código ha expirado")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="La cuenta debe estar verificada para cambiar la contraseña.")

    if not re.match(r"^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*.,]).{8,}$", data.new_password):
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial."
        )

    if pwd_context.verify(data.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="No puedes reutilizar tu contraseña actual.")

    history = db.query(PasswordHistory).filter(PasswordHistory.user_id == user.id).all()
    for old_pwd in history:
        if pwd_context.verify(data.new_password, old_pwd.hashed_password):
            raise HTTPException(status_code=400, detail="Ya has usado esta contraseña anteriormente.")

    new_history_entry = PasswordHistory(
        user_id=user.id,
        hashed_password=user.hashed_password
    )
    db.add(new_history_entry)

    user.hashed_password = pwd_context.hash(data.new_password)
    user.email_verification_code = None
    user.email_code_expires_at = None
    db.commit()

    send_password_changed_email(user.email)

    return {"message": "Contraseña restablecida con éxito. Se ha enviado una confirmación a tu correo."}