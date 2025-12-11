import os
import httpx
from fastapi import FastAPI, HTTPException
from .resilience import fetch_from_service
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Wakanda API Gateway")

TRAFFIC_SERVICE_URL = os.getenv("TRAFFIC_SERVICE_URL", "http://gestion_trafico:8000")
ENERGY_SERVICE_URL = os.getenv("ENERGY_SERVICE_URL", "http://gestion_energia:8000")
WATER_SERVICE_URL = os.getenv("WATER_SERVICE_URL", "http://gestion_agua:8000")
WASTE_SERVICE_URL = os.getenv("WASTE_SERVICE_URL", "http://gestion_residuos:8000")
SECURITY_SERVICE_URL = os.getenv("SECURITY_SERVICE_URL", "http://seguridad_vigilancia:8000")
SECRET_CLUB_BASE_URL = os.getenv("SECRET_CLUB_API_URL", "https://rickandmortyapi.com/api/character")

origins = [

    "http://localhost:3000",
    "http://localhost:5173",
    "*"
]

app.add_middleware(

    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Bienvenido a Wakanda Smart City API",
        "docs": "/docs",
        "services_status": "Online"
    }


@app.get("/traffic/status")
async def proxy_traffic_status():
    async with httpx.AsyncClient() as client:
        try:
            response = await fetch_from_service(f"{TRAFFIC_SERVICE_URL}/traffic/status", client)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de tráfico")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de tráfico no está disponible")


@app.get("/energy/grid")
async def proxy_energy_grid():
    async with httpx.AsyncClient() as client:
        try:
            response = await fetch_from_service(f"{ENERGY_SERVICE_URL}/energy/grid", client)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de energía")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de energía no está disponible")


@app.get("/water/pressure")
async def proxy_water_pressure():
    async with httpx.AsyncClient() as client:
        try:
            response = await fetch_from_service(f"{WATER_SERVICE_URL}/water/pressure", client)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de agua")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de agua no está disponible")


@app.get("/waste/status")
async def proxy_waste_status():
    async with httpx.AsyncClient() as client:
        try:
            response = await fetch_from_service(f"{WASTE_SERVICE_URL}/waste/status", client)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de residuos")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de residuos no está disponible")


@app.get("/security/alerts")
async def proxy_security_alerts():
    async with httpx.AsyncClient() as client:
        try:
            response = await fetch_from_service(f"{SECURITY_SERVICE_URL}/security/alerts", client)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Error en servicio de seguridad")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="El servicio de seguridad no está disponible")


@app.get("/secret-club/{member_id}")
async def proxy_secret_club(member_id: int):
    """
    Obtiene información de un miembro del Club Secreto por su ID.
    (Conecta con la API externa de Rick and Morty)
    """
    async with httpx.AsyncClient() as client:
        try:
            target_url = f"{SECRET_CLUB_BASE_URL}/{member_id}"

            response = await fetch_from_service(target_url, client)

            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Miembro del club no encontrado")
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Acceso denegado al Club Secreto")

            data = response.json()
            return {
                "club_status": "Acceso Autorizado",
                "member_id": data.get("id"),
                "alias": data.get("name"),
                "status": data.get("status"),
                "origin": data.get("origin", {}).get("name")
            }
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="No se pudo contactar con el Club Secreto")
