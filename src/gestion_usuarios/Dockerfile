FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY ./libs/wakanda_common /tmp/wakanda_common
RUN pip install /tmp/wakanda_common

COPY ./gestion_usuarios/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./gestion_usuarios/app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]