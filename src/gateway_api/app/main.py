import os
import httpx
import random
import logging
from datetime import datetime, timezone, timedelta
from kubernetes import client, config
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .resilience import fetch_from_service, post_to_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("WakandaGateway")

app = FastAPI(title="Wakanda API Gateway")

TRAFFIC_SERVICE_URL = os.getenv("TRAFFIC_SERVICE_URL", "http://gestion_trafico:8000")
ENERGY_SERVICE_URL = os.getenv("ENERGY_SERVICE_URL", "http://gestion_energia:8000")
WATER_SERVICE_URL = os.getenv("WATER_SERVICE_URL", "http://gestion_agua:8000")
WASTE_SERVICE_URL = os.getenv("WASTE_SERVICE_URL", "http://gestion_residuos:8000")
SECURITY_SERVICE_URL = os.getenv("SECURITY_SERVICE_URL", "http://seguridad_vigilancia:8000")
USERS_SERVICE_URL = os.getenv("USERS_SERVICE_URL", "http://gestion-usuarios:8000")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")

SECRET_CLUB_API_URL = "https://rickandmortyapi.com/api/character"
POKEMON_API_URL = "https://pokeapi.co/api/v2/pokemon"
HARRY_POTTER_API_URL = "https://hp-api.onrender.com/api/characters"

restarting_services = {}
RESTART_DURATION = 10

origins = ["http://localhost:30000", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:30000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def check_restart_mode(service_name: str):
    if service_name in restarting_services:
        start_time = restarting_services[service_name]
        if datetime.now() - start_time < timedelta(seconds=RESTART_DURATION):
            return True
        else:
            del restarting_services[service_name]
    return False


@app.get("/")
async def root():
    return {"message": "Wakanda OS Gateway Online", "status": "OK"}


@app.get("/traffic/status")
async def proxy_traffic():
    if check_restart_mode("ms-trafico"):
        return {"status": "RESTARTING"}
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{TRAFFIC_SERVICE_URL}/traffic/status", client)).json()


@app.get("/energy/grid")
async def proxy_energy():
    if check_restart_mode("ms-energia"):
        return {"status": "RESTARTING"}
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{ENERGY_SERVICE_URL}/energy/grid", client)).json()


@app.get("/water/pressure")
async def proxy_water():
    if check_restart_mode("ms-agua"):
        return {"status": "RESTARTING"}
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{WATER_SERVICE_URL}/water/pressure", client)).json()


@app.get("/waste/status")
async def proxy_waste():
    if check_restart_mode("ms-residuos"):
        return {"status": "RESTARTING"}
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{WASTE_SERVICE_URL}/waste/status", client)).json()


@app.get("/security/alerts")
async def proxy_security():
    if check_restart_mode("ms-seguridad"):
        return {"status": "RESTARTING"}
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
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code,
                                                        detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/login")
async def proxy_login(request: Request):
    form_data = await request.form()
    data = dict(form_data)
    async with httpx.AsyncClient() as client:
        resp = await post_to_service(f"{USERS_SERVICE_URL}/login", data=data, client=client)
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code,
                                                        detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/verify-account")
async def proxy_verify_account(request: Request):
    form_data = await request.form()
    data = dict(form_data)
    async with httpx.AsyncClient() as client:
        resp = await post_to_service(f"{USERS_SERVICE_URL}/verify-account", data=data, client=client)
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code,
                                                        detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/resend-code")
async def proxy_resend_code(request: Request):
    form_data = await request.form()
    data = dict(form_data)
    async with httpx.AsyncClient() as client:
        resp = await post_to_service(f"{USERS_SERVICE_URL}/resend-code", data=data, client=client)
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code,
                                                        detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.get("/me")
async def proxy_users_me(request: Request):
    token = request.headers.get("authorization")
    headers = {"Authorization": token} if token else {}
    async with httpx.AsyncClient(headers=headers) as client:
        resp = await client.get(f"{USERS_SERVICE_URL}/me")
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code, detail="No autorizado")
        return resp.json()


@app.get("/users")
async def proxy_get_all_users(request: Request):
    token = request.headers.get("authorization")
    headers = {"Authorization": token} if token else {}
    async with httpx.AsyncClient(headers=headers) as client:
        resp = await client.get(f"{USERS_SERVICE_URL}/users")
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.put("/users/{user_id}")
async def proxy_update_user(user_id: int, request: Request):
    token = request.headers.get("authorization")
    headers = {"Authorization": token} if token else {}
    body = await request.json()
    async with httpx.AsyncClient(headers=headers) as client:
        resp = await client.put(f"{USERS_SERVICE_URL}/users/{user_id}", json=body)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/recover/request")
async def proxy_recover_request(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{USERS_SERVICE_URL}/recover/request", json=body)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/recover/confirm")
async def proxy_recover_confirm(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{USERS_SERVICE_URL}/recover/confirm", json=body)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/clubs/verify")
async def proxy_club_verify(request: Request):
    token = request.headers.get("authorization")
    headers = {"Authorization": token} if token else {}
    body = await request.json()
    async with httpx.AsyncClient(headers=headers) as client:
        resp = await client.post(f"{USERS_SERVICE_URL}/clubs/verify", json=body)
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code,
                                                        detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/me/team")
async def proxy_change_team(team_id: int, request: Request):
    token = request.headers.get("authorization")
    headers = {"Authorization": token} if token else {}
    async with httpx.AsyncClient(headers=headers) as client:
        resp = await client.post(f"{USERS_SERVICE_URL}/me/team", params={"team_id": team_id})
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code,
                                                        detail=resp.json().get('detail', 'Error'))
        return resp.json()


@app.post("/me/avatar")
async def proxy_upload_avatar(request: Request):
    token = request.headers.get("authorization")
    headers = {"Authorization": token} if token else {}
    form = await request.form()
    file = form.get("file")
    if not file: raise HTTPException(400, "No file uploaded")
    files = {"file": (file.filename, await file.read(), file.content_type)}
    async with httpx.AsyncClient(headers=headers) as client:
        resp = await client.post(f"{USERS_SERVICE_URL}/me/avatar", files=files)
        if resp.status_code >= 400: raise HTTPException(status_code=resp.status_code, detail="Error subiendo imagen")
        return resp.json()


@app.post("/admin/restart/{service_name}")
def restart_service(service_name: str):
    try:
        restarting_services[service_name] = datetime.now()
        try:
            config.load_incluster_config()
        except:
            config.load_kube_config()

        v1 = client.AppsV1Api()
        deploy = v1.read_namespaced_deployment(name=service_name, namespace="default")
        current_restarts = int((deploy.metadata.annotations or {}).get("wakanda.os/restarts", "0"))
        new_count = current_restarts + 1

        patch_body = {
            "metadata": {"annotations": {"wakanda.os/restarts": str(new_count)}},
            "spec": {"template": {
                "metadata": {"annotations": {"kubectl.kubernetes.io/restartedAt": datetime.now().isoformat()}}}}
        }
        v1.patch_namespaced_deployment(name=service_name, namespace="default", body=patch_body)
        return {"status": "Reiniciando...", "restarts": new_count}
    except Exception as e:
        return {"status": "Error", "detail": str(e)}


@app.get("/admin/k8s/info")
def get_k8s_info():
    try:
        try:
            config.load_incluster_config()
        except:
            config.load_kube_config()

        core_v1 = client.CoreV1Api()
        apps_v1 = client.AppsV1Api()

        manual_restarts_map = {
            d.metadata.name: int((d.metadata.annotations or {}).get("wakanda.os/restarts", "0"))
            for d in apps_v1.list_namespaced_deployment("default").items
        }

        friendly_names = {
            "ms-trafico": "Tráfico aéreo", "ms-energia": "Red vibranium", "ms-agua": "Hidroeléctrica",
            "ms-residuos": "Gestión basura", "ms-seguridad": "Gestión defensa", "ms-usuarios": "Gestión ciudadanos",
            "ms-gateway": "Proxy", "wakanda-frontend": "Panel de control", "postgres-db": "Base de datos central",
            "minio": "Base de datos minio", "prometheus": "Sistema monitoreo"
        }

        pods_by_service = {}

        for p in core_v1.list_namespaced_pod("default").items:
            if p.metadata.deletion_timestamp: continue

            age = "0m"
            if p.status.start_time:
                delta = datetime.now(timezone.utc) - p.status.start_time
                age = f"{int(delta.total_seconds() // 3600)}h {int(delta.total_seconds() % 3600 // 60)}m"

            raw_name = p.metadata.name
            clean_name = raw_name
            restarts = sum(c.restart_count for c in p.status.container_statuses or [])

            matched = False
            for dep_name, manual_count in manual_restarts_map.items():
                if raw_name.startswith(dep_name + "-"):
                    restarts += manual_count
                    clean_name = friendly_names.get(dep_name, dep_name)
                    matched = True
                    break

            if not matched:
                parts = raw_name.split("-")
                if len(parts) > 2:
                    clean_name = friendly_names.get("-".join(parts[:-2]), raw_name)

            pod_data = {
                "name": clean_name,
                "status": p.status.phase,
                "restarts": restarts,
                "age": age,
                "ip": p.status.pod_ip,
                "start_time": p.status.start_time
            }

            if clean_name not in pods_by_service:
                pods_by_service[clean_name] = pod_data
            else:
                existing = pods_by_service[clean_name]
                if p.status.start_time and existing["start_time"] and p.status.start_time > existing["start_time"]:
                    pods_by_service[clean_name] = pod_data

        nodes = [{"name": n.metadata.name, "cpu": n.status.allocatable.get("cpu"),
                  "memory": n.status.allocatable.get("memory")} for n in core_v1.list_node().items]

        return {"pods": list(pods_by_service.values()), "nodes": nodes}
    except Exception as e:
        return {"pods": [], "nodes": [], "error": str(e)}


@app.get("/admin/system/metrics")
async def get_system_metrics():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            cpu = await client.get(f"{PROMETHEUS_URL}/api/v1/query", params={
                "query": 'sum(rate(container_cpu_usage_seconds_total{namespace="default"}[1m]))'})
            mem = await client.get(f"{PROMETHEUS_URL}/api/v1/query",
                                   params={"query": 'sum(container_memory_usage_bytes{namespace="default"})'})
            cpu_v = float(cpu.json()['data']['result'][0]['value'][1]) * 100 if cpu.json()['data']['result'] else 0
            mem_v = float(mem.json()['data']['result'][0]['value'][1]) / (1024 ** 3) if mem.json()['data'][
                'result'] else 0
            return {
                "latency_ms": random.randint(20, 150),
                "requests_per_sec": random.randint(500, 2000),
                "error_rate_percent": round(random.uniform(0.1, 2.5), 2),
                "cpu_usage_percent": round(cpu_v, 2),
                "memory_usage_percent": round(mem_v, 2),
                "active_alerts": 0
            }
    except:
        return {
            "latency_ms": random.randint(20, 150),
            "requests_per_sec": random.randint(500, 2000),
            "error_rate_percent": round(random.uniform(0.1, 2.5), 2),
            "cpu_usage_percent": random.randint(30, 80),
            "memory_usage_percent": random.randint(40, 75),
            "active_alerts": 0
        }