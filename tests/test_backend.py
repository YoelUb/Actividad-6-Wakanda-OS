import os
import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from jose import jwt

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "super-secret-test-key"
os.environ["TRAFFIC_SERVICE_URL"] = "http://mock-traffic"
os.environ["ENERGY_SERVICE_URL"] = "http://mock-energy"
os.environ["WATER_SERVICE_URL"] = "http://mock-water"
os.environ["WASTE_SERVICE_URL"] = "http://mock-waste"
os.environ["SECURITY_SERVICE_URL"] = "http://mock-security"
os.environ["USERS_SERVICE_URL"] = "http://mock-users"

from src.gateway_api.app.main import app as gateway_app, check_restart_mode, restarting_services
from src.gestion_usuarios.app.main import create_access_token, ALGORITHM, SECRET_KEY, app as users_app, pwd_context

client_gateway = TestClient(gateway_app)
client_users = TestClient(users_app)


def test_gateway_root_endpoint():
    response = client_gateway.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Wakanda OS Gateway Online", "status": "OK"}


def test_check_restart_mode_active():
    service_name = "ms-trafico"
    restarting_services[service_name] = datetime.now()
    assert check_restart_mode(service_name) is True


def test_check_restart_mode_expired():
    service_name = "ms-energia"
    restarting_services[service_name] = datetime.now() - timedelta(seconds=20)
    assert check_restart_mode(service_name) is False
    assert service_name not in restarting_services


@patch("src.gateway_api.app.main.fetch_from_service")
def test_gateway_proxy_traffic_status(mock_fetch):
    mock_response = MagicMock()
    mock_response.json.return_value = {"status": "OK", "congestion": "LOW"}
    mock_fetch.return_value = mock_response

    response = client_gateway.get("/traffic/status")
    assert response.status_code == 200
    assert response.json() == {"status": "OK", "congestion": "LOW"}


@patch("src.gateway_api.app.main.config")
@patch("src.gateway_api.app.main.client.AppsV1Api")
def test_gateway_admin_restart_service(mock_k8s_client, mock_config):
    response = client_gateway.post("/admin/restart/ms-trafico")
    assert response.status_code == 200
    assert "Reiniciando servicio ms-trafico" in response.json()["status"]
    assert "ms-trafico" in restarting_services


def test_create_access_token_structure():
    data = {"sub": "shuri@wakanda.es", "role": "ADMIN"}
    token = create_access_token(data)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "shuri@wakanda.es"
    assert payload["role"] == "ADMIN"
    assert "exp" in payload


@patch("src.gestion_usuarios.app.main.SessionLocal")
def test_register_success(mock_session):
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    mock_db.query.return_value.filter.return_value.first.return_value = None

    payload = {
        "email": "nakia@wakanda.es",
        "password": "securepass",
        "name": "Nakia",
        "last_name": "River"
    }
    response = client_users.post("/register", data=payload)
    assert response.status_code == 200
    assert "Usuario creado" in response.json()["msg"]


@patch("src.gestion_usuarios.app.main.SessionLocal")
def test_register_duplicate_email(mock_session):
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    existing_user = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = existing_user

    payload = {
        "email": "duplicate@wakanda.es",
        "password": "123",
        "name": "Test",
        "last_name": "User"
    }
    response = client_users.post("/register", data=payload)
    assert response.status_code == 400
    assert "Email ya registrado" in response.json()["detail"]


@patch("src.gestion_usuarios.app.main.SessionLocal")
def test_register_invalid_name_validation(mock_session):
    mock_db = MagicMock()
    mock_session.return_value = mock_db
    mock_db.query.return_value.filter.return_value.first.return_value = None

    payload = {
        "email": "test@wakanda.es",
        "password": "123",
        "name": "TChalla123",
        "last_name": "Udaku"
    }
    response = client_users.post("/register", data=payload)
    assert response.status_code == 400
    assert "Nombre y Apellidos solo pueden contener letras" in response.json()["detail"]


@patch("src.gestion_usuarios.app.main.SessionLocal")
def test_login_success(mock_session):
    mock_db = MagicMock()
    mock_session.return_value = mock_db

    mock_user = MagicMock()
    mock_user.email = "okoye@wakanda.es"
    mock_user.hashed_password = pwd_context.hash("general123")
    mock_user.is_verified = True
    mock_user.role = "CITIZEN"

    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {"username": "okoye@wakanda.es", "password": "general123"}
    response = client_users.post("/login", data=payload)

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


@patch("src.gestion_usuarios.app.main.SessionLocal")
def test_login_wrong_password(mock_session):
    mock_db = MagicMock()
    mock_session.return_value = mock_db

    mock_user = MagicMock()
    mock_user.email = "okoye@wakanda.es"
    mock_user.hashed_password = pwd_context.hash("general123")

    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {"username": "okoye@wakanda.es", "password": "wrongpassword"}
    response = client_users.post("/login", data=payload)

    assert response.status_code == 401
    assert "Credenciales incorrectas" in response.json()["detail"]


@patch("src.gestion_usuarios.app.main.SessionLocal")
def test_login_unverified_user(mock_session):
    mock_db = MagicMock()
    mock_session.return_value = mock_db

    mock_user = MagicMock()
    mock_user.hashed_password = pwd_context.hash("pass")
    mock_user.is_verified = False

    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {"username": "new@wakanda.es", "password": "pass"}
    response = client_users.post("/login", data=payload)

    assert response.status_code == 200
    assert response.json()["status"] == "VERIFICATION_REQUIRED"


def test_protected_route_without_token():
    response = client_users.get("/me")
    assert response.status_code == 401


@patch("src.gestion_agua.app.main.AsyncSessionLocal")
def test_water_pressure_data_structure(mock_session):
    with patch.dict(os.environ, {"DATABASE_URL": "sqlite:///./water.db"}):
        from src.gestion_agua.app.main import get_water_pressure
        mock_db = MagicMock()
        result = asyncio.run(get_water_pressure(mock_db))

        assert "pressure_psi" in result
        assert "purity_level" in result
        assert result["service"] == "Gestión de Agua"
        assert 35 <= result["pressure_psi"] <= 90