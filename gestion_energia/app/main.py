from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from prometheus_client import make_asgi_app, Counter

app = FastAPI(title="Servicio de Energía Wakanda")

# Métrica propia
ENERGY_REQUESTS = Counter('energy_requests_total', 'Peticiones al servicio de energía')
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/energy/grid")
async def get_grid_status(db: AsyncSession = Depends(get_db)):
    """
    Simula el estado de la red eléctrica
    """
    ENERGY_REQUESTS.inc()

    try:
        result = await db.execute(text("SELECT 'Conexión OK energy_db'"))
        db_status = result.scalar()
    except Exception as e:
        db_status = f"Error DB: {str(e)}"

    return {
        "service": "Gestión de Energía",
        "status": "Red Estable",
        "voltage": "220V",
        "load": "78%",
        "db_connection": db_status
    }