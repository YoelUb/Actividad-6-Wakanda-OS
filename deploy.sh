#!/bin/bash

echo "Iniciando despliegue WAKANDA OS en Kubernetes..."

#Limpiar entorno anterior para asegurar reinicio limpio
echo "Limpiando despliegues anteriores..."
kubectl delete -f k8s/ --ignore-not-found=true
echo "Esperando limpieza..."
sleep 5

# Construir todas las imágenes
echo "Construyendo imágenes Docker..."

# Backend
docker build -t wakanda/trafico:latest -f src/gestion_trafico/Dockerfile src &
docker build -t wakanda/energia:latest -f src/gestion_energia/Dockerfile src &
docker build -t wakanda/agua:latest -f src/gestion_agua/Dockerfile src &
docker build -t wakanda/residuos:latest -f src/gestion_residuos/Dockerfile src &
docker build -t wakanda/seguridad:latest -f src/gestion_vigilancia/Dockerfile src &
docker build -t wakanda/usuarios:latest -f src/gestion_usuarios/Dockerfile src &
docker build -t wakanda/gateway:latest -f src/gateway_api/Dockerfile src &

# Frontend
docker build -t wakanda/frontend:latest wakanda_frontend &

# Esperar a que todas las construcciones terminen
wait
echo "Imágenes construidas."

# 3. Desplegar en Kubernetes en orden
echo "Desplegando en Kubernetes..."

kubectl apply -f k8s/config-secrets.yaml
kubectl apply -f k8s/infraestructure.yaml

echo "Esperando 10s para que la Base de Datos inicialice..."
sleep 10

kubectl apply -f k8s/microservices.yaml
kubectl apply -f k8s/acces.yaml

#Mostrar estado final
echo "🎉 ¡Despliegue completado! Monitorizando pods..."
kubectl get pods -w