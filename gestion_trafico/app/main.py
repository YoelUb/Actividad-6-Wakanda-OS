from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from prometheus_client import make_asgi_app, Counter

app = FastAPI(title="Servicio de Tráfico Wakanda")

REQUEST_COUNT = Counter('traffic_requests_total', 'Total de peticiones al servicio de tráfico')

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/traffic/status")
async def get_traffic_status(db: AsyncSession = Depends(get_db)):
    """
    Devuelve el estado de los semáforos.
    (Actividad 6: Requisito funcional básico)
    """
    REQUEST_COUNT.inc()

    try:
        result = await db.execute(text("SELECT 'Conexión Exitosa con traffic_db'"))
        db_status = result.scalar()
    except Exception as e:
        db_status = f"Error DB: {str(e)}"

    return {
        "service": "Gestión de Tráfico",
        "status": "Operativo",
        "db_connection": db_status,
        "intersection_id": "I-12",
        "signal_phase": "NS_GREEN"
    }


@app.get("/health")
async def health_check():
    return {"status": "ok"}