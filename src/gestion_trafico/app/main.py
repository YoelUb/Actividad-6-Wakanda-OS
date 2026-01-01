import os
import random
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from prometheus_client import make_asgi_app, Counter
from wakanda_common import get_db_engine, get_db_session_maker

app = FastAPI(title="Servicio de tráfico aéreo")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = get_db_engine(DATABASE_URL)
AsyncSessionLocal = get_db_session_maker(engine)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

TRAFFIC_REQUESTS = Counter('traffic_requests_total', 'Peticiones al servicio de tráfico')
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.get("/traffic/status")
async def get_traffic_status(db: AsyncSession = Depends(get_db)):
    """
    Simula el estado del tráfico aéreo y de naves
    """
    TRAFFIC_REQUESTS.inc()
    try:
        result = await db.execute(text("SELECT 'Conexión OK traffic_db'"))
        db_status = result.scalar()
    except Exception as e:
        db_status = f"Error DB: {str(e)}"

    estados = ["FLUIDO", "MODERADO", "DENSO", "CONGESTIONADO"]
    nivel = random.choice(estados)

    return {
        "service": "Gestión de Tráfico",
        "status": nivel,
        "congestion_level": f"{random.randint(5, 98)}%",
        "avg_speed": f"{random.randint(200, 800)} km/h",
        "active_drones": random.randint(120, 450),
        "incidents_reported": random.randint(0, 3),
        "db_connection": db_status
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}