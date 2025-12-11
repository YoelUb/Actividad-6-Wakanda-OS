FROM python:3.10-slim

WORKDIR /app


COPY ./libs/wakanda_common /tmp/wakanda_common
RUN pip install /tmp/wakanda_common


COPY ./gestion_residuos/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


COPY ./gestion_residuos/app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]