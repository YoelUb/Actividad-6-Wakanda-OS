import os
import httpx
from fastapi import FastAPI, HTTPException, Request
from .resilience import fetch_from_service, post_to_service
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Wakanda API Gateway")

TRAFFIC_SERVICE_URL = os.getenv("TRAFFIC_SERVICE_URL", "http://gestion_trafico:8000")
ENERGY_SERVICE_URL = os.getenv("ENERGY_SERVICE_URL", "http://gestion_energia:8000")
WATER_SERVICE_URL = os.getenv("WATER_SERVICE_URL", "http://gestion_agua:8000")
WASTE_SERVICE_URL = os.getenv("WASTE_SERVICE_URL", "http://gestion_residuos:8000")
SECURITY_SERVICE_URL = os.getenv("SECURITY_SERVICE_URL", "http://seguridad_vigilancia:8000")
USERS_SERVICE_URL = os.getenv("USERS_SERVICE_URL", "http://gestion-usuarios:8000")

SECRET_CLUB_API_URL = "https://rickandmortyapi.com/api/character"
POKEMON_API_URL = "https://pokeapi.co/api/v2/pokemon"
HARRY_POTTER_API_URL = "https://hp-api.onrender.com/api/characters"

origins = [
    "http://localhost:30000",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:30000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Usa la lista limpia
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


@app.post("/register")
async def proxy_register(request: Request):
    form_data = await request.form()
    data = dict(form_data)

    async with httpx.AsyncClient() as client:
        resp = await post_to_service(f"{USERS_SERVICE_URL}/register", data=data, client=client)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/login")
async def proxy_login(request: Request):
    form_data = await request.form()
    data = dict(form_data)

    async with httpx.AsyncClient() as client:
        resp = await post_to_service(f"{USERS_SERVICE_URL}/login", data=data, client=client)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/verify-2fa")
async def proxy_verify_2fa(code: str, temp_token: str):
    async with httpx.AsyncClient() as client:
        url = f"{USERS_SERVICE_URL}/verify-2fa"
        params = {"code": code, "temp_token": temp_token}
        resp = await post_to_service(url, params=params, client=client)

        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/verify-account")
async def proxy_verify_account(request: Request):
    form_data = await request.form()
    data = dict(form_data)

    async with httpx.AsyncClient() as client:
        resp = await post_to_service(f"{USERS_SERVICE_URL}/verify-account", data=data, client=client)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/resend-code")
async def proxy_resend_code(request: Request):
    form_data = await request.form()
    data = dict(form_data)

    async with httpx.AsyncClient() as client:
        resp = await post_to_service(f"{USERS_SERVICE_URL}/resend-code", data=data, client=client)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()