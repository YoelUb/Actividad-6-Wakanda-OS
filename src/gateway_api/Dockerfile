FROM python:3.10-slim

WORKDIR /app


COPY ./gateway_api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./gateway_api/app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]