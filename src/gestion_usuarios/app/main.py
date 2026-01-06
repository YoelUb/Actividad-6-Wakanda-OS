import os
import httpx
import random
import logging
from datetime import datetime, timezone, timedelta
from kubernetes import client, config
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from .resilience import fetch_from_service, post_to_service
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
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
        return {
            "status": "⚠️ REINICIANDO SISTEMA",
            "congestion_level": "CALIBRANDO SENSORES...",
            "avg_speed": "---",
            "active_drones": 0,
            "incidents_reported": 0,
            "db_connection": "MAINTENANCE"
        }
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{TRAFFIC_SERVICE_URL}/traffic/status", client)).json()


@app.get("/energy/grid")
async def proxy_energy():
    if check_restart_mode("ms-energia"):
        return {
            "status": "⚡ REINICIANDO RED",
            "voltage_v": 0,
            "frequency_hz": 0,
            "vibranium_core_load": "ESTABILIZANDO...",
            "active_turbines": 0,
            "db_connection": "MAINTENANCE"
        }
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{ENERGY_SERVICE_URL}/energy/grid", client)).json()


@app.get("/water/pressure")
async def proxy_water():
    if check_restart_mode("ms-agua"):
        return {
            "status": "💧 PURGANDO TUBERÍAS",
            "pressure_psi": 0,
            "ph_level": 0,
            "purity_level": "ANALIZANDO...",
            "reserve_level": "---",
            "db_connection": "MAINTENANCE"
        }
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{WATER_SERVICE_URL}/water/pressure", client)).json()


@app.get("/waste/status")
async def proxy_waste():
    if check_restart_mode("ms-residuos"):
        return {
            "status": "♻️ REINICIANDO COMPACTADORES",
            "trucks_active": 0,
            "recycling_centers_online": 0,
            "avg_bin_fill_level": "---",
            "incinerator_temp": "ENFRIANDO...",
            "db_connection": "MAINTENANCE"
        }
    async with httpx.AsyncClient() as client:
        return (await fetch_from_service(f"{WASTE_SERVICE_URL}/waste/status", client)).json()


@app.get("/security/alerts")
async def proxy_security():
    if check_restart_mode("ms-seguridad"):
        return {
            "status": "🛡️ REINICIANDO PROTOCOLOS",
            "alert_level": "NEUTRAL",
            "border_integrity": "ESCANEANDO...",
            "detected_threats": 0,
            "patrol_drones": 0,
            "db_connection": "MAINTENANCE"
        }
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
        logger.info(f"🔄 Activando modo mantenimiento para {service_name}")
        restarting_services[service_name] = datetime.now()

        try:
            config.load_incluster_config()
        except:
            try:
                config.load_kube_config()
            except:
                logger.warning("No se pudo cargar configuración de K8s. Ejecutando en modo simulación local.")

        v1 = client.AppsV1Api()

        # 1. Recuperamos el Deployment actual para ver cuántos reinicios lleva
        try:
            current_deploy = v1.read_namespaced_deployment(name=service_name, namespace="default")
            current_restarts = int(current_deploy.metadata.annotations.get("wakanda.os/restarts", "0")
                                   if current_deploy.metadata.annotations else "0")
        except:
            current_restarts = 0

        new_restart_count = current_restarts + 1

        # 2. Guardamos el nuevo contador en el Deployment (persistencia)
        # Y actualizamos la fecha en el template del Pod (para forzar el rollout)
        patch_body = {
            "metadata": {
                "annotations": {
                    "wakanda.os/restarts": str(new_restart_count)
                }
            },
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt": str(datetime.now())
                        }
                    }
                }
            }
        }
        v1.patch_namespaced_deployment(name=service_name, namespace="default", body=patch_body)

        return {"status": f"Reiniciando servicio {service_name}...", "timestamp": str(datetime.now())}
    except Exception as e:
        logger.error(f"⛔ FALLO AL REINICIAR {service_name}: {str(e)}")
        return {"status": "Reinicio simulado activado (K8s no disponible)", "error": str(e)}


@app.get("/admin/k8s/info")
def get_k8s_info():
    try:
        try:
            config.load_incluster_config()
        except:
            config.load_kube_config()

        core_v1 = client.CoreV1Api()
        apps_v1 = client.AppsV1Api()

        # 1. Obtenemos el mapa de reinicios manuales de todos los Deployments
        manual_restarts_map = {}
        try:
            deployments = apps_v1.list_namespaced_deployment(namespace="default")
            for d in deployments.items:
                val = d.metadata.annotations.get("wakanda.os/restarts", "0") if d.metadata.annotations else "0"
                manual_restarts_map[d.metadata.name] = int(val)
        except:
            pass

        pods = core_v1.list_namespaced_pod("default")
        pod_list = []

        friendly_names = {
            "ms-trafico": "Tráfico aéreo",
            "ms-energia": "Red vibranium",
            "ms-agua": "Hidroeléctrica",
            "ms-residuos": "Gestión basura",
            "ms-seguridad": "Gestión defensa",
            "ms-usuarios": "Gestión ciudadanos",
            "ms-gateway": "Proxy",
            "wakanda-frontend": "Panel de control",
            "postgres-db": "Base de datos central",
            "minio": "Base de datos minio",
            "prometheus": "Sistema monitoreo"
        }

        for p in pods.items:
            # Ignorar pods muriendo
            if p.metadata.deletion_timestamp:
                continue

            start_time = p.status.start_time
            age = "Recién nacido"

            if start_time:
                now = datetime.now(timezone.utc)
                if start_time.tzinfo:
                    delta = now - start_time
                else:
                    delta = datetime.now() - start_time

                total_seconds = int(delta.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                age = f"{hours}h {minutes}m"

            raw_name = p.metadata.name
            clean_name = raw_name
            deployment_key = raw_name  # Por defecto
            parts = raw_name.split('-')

            if len(parts) >= 3:
                potential_name = "-".join(parts[:-2])
                deployment_key = potential_name  # Clave técnica para buscar el contador
                if potential_name in friendly_names:
                    clean_name = friendly_names[potential_name]
                else:
                    clean_name = potential_name
            elif len(parts) == 2 and parts[0] == "minio":
                clean_name = friendly_names.get("minio", "Minio")
            else:
                for key, val in friendly_names.items():
                    if raw_name.startswith(key):
                        clean_name = val
                        deployment_key = key
                        break

            # CÁLCULO DE REINICIOS TOTALES
            pod_crash_restarts = sum(
                c.restart_count for c in p.status.container_statuses) if p.status.container_statuses else 0
            manual_restarts = manual_restarts_map.get(deployment_key, 0)
            total_restarts = pod_crash_restarts + manual_restarts

            pod_list.append({
                "name": clean_name,
                "status": p.status.phase,
                "restarts": total_restarts,
                "age": age,
                "ip": p.status.pod_ip
            })

        nodes = core_v1.list_node()
        node_metrics = []
        for n in nodes.items:
            raw_node_name = n.metadata.name
            display_name = raw_node_name
            if "docker-desktop" in raw_node_name.lower():
                display_name = "CLUSTER-WAKANDA"
            elif "minikube" in raw_node_name.lower():
                display_name = "CLUSTER-MINI-WAKANDA"

            cpu = n.status.allocatable.get("cpu")
            memory = n.status.allocatable.get("memory")
            node_metrics.append({"name": display_name, "cpu": cpu, "memory": memory})

        return {"pods": pod_list, "nodes": node_metrics}
    except Exception as e:
        logger.error(f"🔥 ERROR CRÍTICO EN KUBERNETES: {str(e)}")
        return {"pods": [], "nodes": [], "error": str(e)}


@app.get("/admin/system/metrics")
async def get_system_metrics():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            cpu_res = await client.get(f"{PROMETHEUS_URL}/api/v1/query", params={
                "query": 'sum(rate(container_cpu_usage_seconds_total{namespace="default"}[1m]))'})
            mem_res = await client.get(f"{PROMETHEUS_URL}/api/v1/query",
                                       params={"query": 'sum(container_memory_usage_bytes{namespace="default"})'})

            cpu_val = float(cpu_res.json()['data']['result'][0]['value'][1]) * 100 if cpu_res.json()['data'][
                'result'] else 0
            mem_val = float(mem_res.json()['data']['result'][0]['value'][1]) / (1024 ** 3) if mem_res.json()['data'][
                'result'] else 0

            return {
                "latency_ms": random.randint(20, 150),
                "requests_per_sec": random.randint(500, 2000),
                "error_rate_percent": round(random.uniform(0.1, 2.5), 2),
                "cpu_usage_percent": round(cpu_val, 2),
                "memory_usage_percent": round(mem_val, 2),
                "active_alerts": 0
            }
    except Exception:
        return {
            "latency_ms": random.randint(20, 150),
            "requests_per_sec": random.randint(500, 2000),
            "error_rate_percent": round(random.uniform(0.1, 2.5), 2),
            "cpu_usage_percent": random.randint(30, 80),
            "memory_usage_percent": random.randint(40, 75),
            "active_alerts": 0
        }