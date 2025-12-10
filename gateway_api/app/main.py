import os
import httpx
from fastapi import FastAPI, HTTPException

app = FastAPI(title="Wakanda API Gateway")

TRAFFIC_SERVICE_URL = os.getenv("TRAFFIC_SERVICE_URL", "http://gestion_trafico:8000")
ENERGY_SERVICE_URL = os.getenv("ENERGY_SERVICE_URL", "http://gestion_energia:8000")

@app.get("/")
async def root():
    return {
        "message": "Bienvenido a Wakanda Smart City API",
        "docs": "/docs",
        "services": {
            "traffic": TRAFFIC_SERVICE_URL,
            "energy": ENERGY_SERVICE_URL
        }
    }

@app.get("/traffic/status")
async def proxy_traffic_status():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{TRAFFIC_SERVICE_URL}/traffic/status")
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de tráfico")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de tráfico no está disponible")

@app.get("/energy/grid")
async def proxy_energy_grid():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{ENERGY_SERVICE_URL}/energy/grid")
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de energía")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de energía no está disponible")