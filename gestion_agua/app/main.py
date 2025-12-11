import os
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from prometheus_client import make_asgi_app, Counter
from wakanda_common import get_db_engine, get_db_session_maker

app = FastAPI(title="Servicio de Agua Wakanda")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = get_db_engine(DATABASE_URL)
AsyncSessionLocal = get_db_session_maker(engine)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

WATER_REQUESTS = Counter('water_requests_total', 'Peticiones al servicio de agua')
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.get("/water/pressure")
async def get_water_pressure(db: AsyncSession = Depends(get_db)):
    """
    Simula el estado de la presión del agua y tuberías
    """
    WATER_REQUESTS.inc()
    try:
        result = await db.execute(text("SELECT 'Conexión OK water_db'"))
        db_status = result.scalar()
    except Exception as e:
        db_status = f"Error DB: {str(e)}"

    return {
        "service": "Gestión de Agua",
        "status": "Presión Nominal",
        "pressure_psi": 45,
        "ph_level": 7.2,
        "db_connection": db_status
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}