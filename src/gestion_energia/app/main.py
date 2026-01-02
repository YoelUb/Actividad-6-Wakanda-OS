import os
import random
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from prometheus_client import make_asgi_app, Counter
from wakanda_common import get_db_engine, get_db_session_maker

app = FastAPI(title="Servicio de energía vibranium")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = get_db_engine(DATABASE_URL)
AsyncSessionLocal = get_db_session_maker(engine)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


ENERGY_REQUESTS = Counter('energy_requests_total', 'Peticiones al servicio de energía')
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/energy/grid")
async def get_energy_grid(db: AsyncSession = Depends(get_db)):
    """
    Simula el estado de la red eléctrica de Vibranium
    """
    ENERGY_REQUESTS.inc()
    try:
        result = await db.execute(text("SELECT 'Conexión OK energy_db'"))
        db_status = result.scalar()
    except Exception as e:
        db_status = f"Error DB: {str(e)}"

    estados = ["ESTABLE", "PICO CONSUMO", "CARGA ALTA", "OPTIMO"]

    return {
        "service": "Gestión de Energía",
        "status": random.choice(estados),
        "voltage_v": random.randint(215, 245),
        "frequency_hz": round(random.uniform(49.8, 50.2), 2),
        "vibranium_core_load": f"{random.randint(30, 95)}%",
        "active_turbines": random.randint(8, 16),
        "db_connection": db_status
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}