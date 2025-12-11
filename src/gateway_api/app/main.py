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

SECRET_CLUB_API_URL = "https://rickandmortyapi.com/api/character"
POKEMON_API_URL = "https://pokeapi.co/api/v2/pokemon"
HARRY_POTTER_API_URL = "https://hp-api.onrender.com/api/characters"

origins = ["http://localhost:3000", "http://localhost:5173", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Wakanda OS Gateway Online", "status": "OK"}

@app.get("/traffic/status")
async def proxy_traffic():
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{TRAFFIC_SERVICE_URL}/traffic/status", client)).json()

@app.get("/energy/grid")
async def proxy_energy():
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{ENERGY_SERVICE_URL}/energy/grid", client)).json()

@app.get("/water/pressure")
async def proxy_water():
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{WATER_SERVICE_URL}/water/pressure", client)).json()

@app.get("/waste/status")
async def proxy_waste():
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{WASTE_SERVICE_URL}/waste/status", client)).json()

@app.get("/security/alerts")
async def proxy_security():
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{SECURITY_SERVICE_URL}/security/alerts", client)).json()

@app.get("/secret-club/roster")
async def get_rick_roster():
    async with httpx.AsyncClient() as client:
        resp = await fetch_from_service(SECRET_CLUB_API_URL, client)
        return resp.json()

@app.get("/secret-club/{id}")
async def get_rick_member(id: int):
    async with httpx.AsyncClient() as client:
        resp = await fetch_from_service(f"{SECRET_CLUB_API_URL}/{id}", client)
        if resp.status_code != 200: raise HTTPException(404, "Morty no encontrado")
        return resp.json()

@app.get("/pokemon/roster")
async def get_pokemon_roster():
    async with httpx.AsyncClient() as client:
        resp = await fetch_from_service(f"{POKEMON_API_URL}?limit=20", client)
        return resp.json()

@app.get("/pokemon/{id}")
async def get_pokemon_detail(id: str):
    async with httpx.AsyncClient() as client:
        resp = await fetch_from_service(f"{POKEMON_API_URL}/{id}", client)
        if resp.status_code != 200: raise HTTPException(404, "Pokémon escapó")
        data = resp.json()
        return {
            "id": data["id"],
            "name": data["name"],
            "image": data["sprites"]["other"]["official-artwork"]["front_default"],
            "types": [t["type"]["name"] for t in data["types"]],
            "height": data["height"],
            "weight": data["weight"],
            "abilities": [a["ability"]["name"] for a in data["abilities"]]
        }

@app.get("/hogwarts/roster")
async def get_hp_roster():
    async with httpx.AsyncClient() as client:
        resp = await fetch_from_service(HARRY_POTTER_API_URL, client)
        all_chars = resp.json()
        return all_chars[:24]

@app.get("/hogwarts/{id}")
async def get_hp_detail(id: str):
    async with httpx.AsyncClient() as client:
        resp = await fetch_from_service(HARRY_POTTER_API_URL, client)
        all_chars = resp.json()
        try:
            idx = int(id) - 1
            if 0 <= idx < len(all_chars):
                return all_chars[idx]
        except:
            pass
        raise HTTPException(404, "Muggle no encontrado")