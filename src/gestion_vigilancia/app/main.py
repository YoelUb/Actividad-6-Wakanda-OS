import os
import random
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from prometheus_client import make_asgi_app, Counter
from wakanda_common import get_db_engine, get_db_session_maker

app = FastAPI(title="Servicio de seguridad y drones")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = get_db_engine(DATABASE_URL)
AsyncSessionLocal = get_db_session_maker(engine)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

SECURITY_REQUESTS = Counter('security_requests_total', 'Peticiones al servicio de seguridad')
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.get("/security/alerts")
async def get_security_alerts(db: AsyncSession = Depends(get_db)):
    """
    Simula el sistema de defensa fronteriza
    """
    SECURITY_REQUESTS.inc()
    try:
        result = await db.execute(text("SELECT 'Conexión OK security_db'"))
        db_status = result.scalar()
    except Exception as e:
        db_status = f"Error DB: {str(e)}"

    alertas = ["VERDE", "AMARILLA", "NARANJA", "ROJA"]
    nivel = random.choice(alertas)

    return {
        "service": "Seguridad Fronteriza",
        "status": "VIGILANCIA ACTIVA",
        "alert_level": nivel,
        "border_integrity": f"{random.uniform(92.0, 100.0):.2f}%",
        "detected_threats": random.randint(0, 5) if nivel != "VERDE" else 0,
        "patrol_drones": random.randint(20, 60),
        "db_connection": db_status
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}