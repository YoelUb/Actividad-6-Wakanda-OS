# Actividad-6-wakanda-os
### Innovación, resiliencia y tecnología para la ciudad dorada

---

## Construido con las siguientes tecnologías

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000)
![Pip](https://img.shields.io/badge/PIP-3775A9?style=for-the-badge&logo=python&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=000)
![Api modular](https://img.shields.io/badge/API%20Modular-4CAF50?style=for-the-badge&logo=api&logoColor=white)

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Por qué wakanda os](#por-qué-wakanda-os)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Pruebas (testing)](#pruebas-testing)
- [Usuarios](#usuarios-)
- [Contacto](#contacto-)

---

## Descripción general

**Actividad-6-wakanda-os** es un sistema operativo urbano (smart city os) de última generación diseñado para gestionar la infraestructura crítica de la nación de wakanda.

Este proyecto implementa una arquitectura de microservicios robusta y escalable, capaz de monitorear y controlar servicios esenciales como:

- Tráfico  
- Energía  
- Agua  
- Residuos  
- Seguridad  

Todo el sistema está orquestado bajo altos estándares de resiliencia, seguridad y escalabilidad.

---

## Por qué wakanda os

Este sistema no es solo un panel de control, sino una simulación de un entorno de producción real con características avanzadas:

- **Arquitectura de microservicios**  

  Servicios desacoplados para tráfico, energía, agua, residuos y vigilancia, comunicándose mediante un api gateway central.

- **Resiliencia y autocuración**  
  Implementación de patrones como circuit breaker y reinicios simulados para garantizar la disponibilidad del sistema.

- **Seguridad vibranium**  
  Autenticación robusta mediante jwt (json web tokens), con roles diferenciados (ciudadano y administrador) y verificación de doble factor simulada.

- **Integración con kubernetes**  
  Manifiestos preparados para el despliegue en clústeres reales, incluyendo configuración de secretos y control de accesos (rbac).

- **Frontend reactivo**  
  Interfaz moderna desarrollada con react y vite, con actualizaciones en tiempo real y paneles dinámicos.

---

## Arquitectura del sistema

El sistema se compone de los siguientes módulos:

- **API Gateway**:

  - Punto de entrada único que enruta, autentica y protege las peticiones entrantes hacia los microservicios.

- **Gestión de Usuarios**:

  - Servicio de identidad encargado de la autenticación, registro y gestión de perfiles (ciudadanos y administradores).

- **Persistencia de Datos**: Estrategia de almacenamiento híbrida:

  - **PostgreSQL:** Base de datos relacional para la gestión transaccional de usuarios y estados operativos.
  
  - **MinIO:** Almacenamiento de objetos (*Object Storage*) compatible con S3 para logs masivos y reportes no estructurados, se utiliza para los perfiles.

- **Servicios Operativos**: Microservicios independientes y desacoplados para la gestión de la ciudad:
  - Agua
  - Energía
  - Residuos
  - Tráfico
  - Vigilancia

- **Frontend**:

  - Aplicación SPA (*Single Page Application*) desarrollada en React que consume las APIs y visualiza el estado de la ciudad en tiempo real.
  - Tres apis distintas: Rick y Morty, Pokemon y Harry potter.

- **Infraestructura**:
  - Contenedores Docker orquestados mediante **Kubernetes**, garantizando alta disponibilidad, escalado automático y recuperación ante fallos (*self-healing*).

---

## Requisitos previos

Antes de desplegar el sistema, es necesario contar con las siguientes herramientas:

- Docker y docker compose  
- Node.js y npm  
- Python 3.11 o superior  
- Minikube o un clúster kubernetes (opcional)

---

## Instalación

### 1. Clonar el repositorio

```bash
  git clone https://github.com/YoelUb/Actividad-6-Wakanda-OS.git
  cd Actividad-6-Wakanda-OS
```

## 2. Configuración del entorno

Revisar el archivo `.env.example` para crear tu propio `.env` y verificar las variables definidas en el archivo `docker-compose.yml.`



## 3. Levantar la infraestructura

Ejecutar el siguiente comando para iniciar los servicios:

1. Dar permisos: 

```bash
 chmod +x deploy.sh
```

2. Ejecutar el comando: 

```bash
  ./deploy.sh
```
**Nota**: Este script eliminará los recursos previos en el namespace por defecto de Kubernetes para asegurar una instalación limpia.

3. Acceder a la aplicación: 

- Una vez finalizado el despliegue, la aplicación web estará disponible a través del NodePort configurado:
    
    **http://localhost:30000**


---

## Pruebas (testing)
- El proyecto incluye suites de pruebas tanto para el backend como para el frontend.

### Backend (Pytest)

Las pruebas de backend verifican la integridad de los microservicios, la lógica de autenticación JWT y la respuesta del Gateway.

1. **Preparar el entorno**: Para evitar conflictos con las versiones de tu sistema, crea un entorno limpio:

```bash
  # Crear y activar entorno virtual
  python3 -m venv .venv
  
  # En Mac/Linux:
  source .venv/bin/activate
  
  # En Windows:
  .venv\Scripts\activate
```

2. **Instalar dependencias**: Es necesario instalar las librerías de todos los módulos que participan en la prueba y armonizar versiones:

```bash
  pip install -r src/gateway_api/requirements.txt
  pip install -r src/gestion_usuarios/requirements.txt
  pip install -r src/gestion_agua/requirements.txt
  pip install pytest httpx
  pip install --upgrade fastapi pydantic uvicorn
```

3. **Ejecutar los test**:

```bash
  python -m pytest tests/test_backend.py
```

**¿Qué se prueba?:**

- Endpoints del gateway (Status, Routing).

- Autenticación (Login, Registro, manejo de Tokens).

- Lógica de reinicio de servicios (Resiliencia).

- Datos de sensores (Presión de agua, etc.).

### Frontend (Jest + React Testing Library)

- Las pruebas de frontend aseguran que los componentes de la interfaz se rendericen correctamente.

1. Navegar al directorio del frontend e instalar dependencias:

```bash
  cd wakanda_frontend
  npm install
```

2. Ejecutar los tests:

```bash
  npm test
```

---

## Usuarios 


- El **administrador** de prueba para la demo del programa viene por defecto:
- Usuario => **admin@wakanda.es**
- Contraseña => **admin123**

---

## Contacto 

- Escribir ante cualquier duda --> yoelurquijo13@gmail.com

---



