import os
from fastapi import FastAPI, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from prometheus_client import make_asgi_app, Counter
from wakanda_common import get_db_engine, get_db_session_maker

app = FastAPI(title="Servicio de Residuos Wakanda")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = get_db_engine(DATABASE_URL)
AsyncSessionLocal = get_db_session_maker(engine)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

WASTE_REQUESTS = Counter('waste_requests_total', 'Peticiones al servicio de residuos')
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.get("/waste/status")
async def get_waste_status(db: AsyncSession = Depends(get_db)):
    """
    Consulta el estado de los contenedores inteligentes
    """
    WASTE_REQUESTS.inc()
    try:
        result = await db.execute(text("SELECT 'Conexión OK waste_db'"))
        db_status = result.scalar()
    except Exception as e:
        db_status = f"Error DB: {str(e)}"

    return {
        "service": "Gestión de Residuos",
        "status": "Operativo",
        "containers_full": 12,
        "next_pickup": "14:00",
        "db_connection": db_status
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}