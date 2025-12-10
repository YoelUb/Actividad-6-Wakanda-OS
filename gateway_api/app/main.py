import httpx
from fastapi import FastAPI, HTTPException

app = FastAPI(title="Wakanda API Gateway")

TRAFFIC_SERVICE_URL = "http://gestion_trafico:8000"


@app.get("/")
async def root():
    return {"message": "Bienvenido a Wakanda Smart City API"}


@app.get("/traffic/status")
async def proxy_traffic_status():
    """
    Ruta Proxy:
    1. El usuario llama a GET /traffic/status aquí.
    2. El Gateway llama internamente al microservicio de tráfico.
    3. El Gateway devuelve la respuesta al usuario.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{TRAFFIC_SERVICE_URL}/traffic/status")

            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de tráfico")

            return response.json()

        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de tráfico no está disponible")