#!/bin/bash

echo "--------------------------------------------------------"
echo "--------------------------------------------------------"
echo "INICIANDO DESPLIEGUE COMPLETO DE WAKANDA OS DESDE CERO..."
echo "--------------------------------------------------------"
echo "--------------------------------------------------------"

echo "Eliminando todos los recursos de Kubernetes..."
kubectl delete -f k8s/ --ignore-not-found=true
kubectl delete deployment --all --ignore-not-found=true
kubectl delete service --all --ignore-not-found=true
kubectl delete configmap --all --ignore-not-found=true
kubectl delete secret --all --ignore-not-found=true
kubectl delete pvc --all --ignore-not-found=true
kubectl delete pv --all --ignore-not-found=true

echo "--------------------------------------------------------"
echo "Esperando 15s para asegurar limpieza total..."
echo "--------------------------------------------------------"
sleep 15

echo "--------------------------------------------------------"
echo "--------------------------------------------------------"
echo "Construyendo imágenes Docker desde cero..."
echo "--------------------------------------------------------"
echo "--------------------------------------------------------"

docker build -t wakanda/trafico:latest -f src/gestion_trafico/Dockerfile src
docker build -t wakanda/energia:latest -f src/gestion_energia/Dockerfile src
docker build -t wakanda/agua:latest -f src/gestion_agua/Dockerfile src
docker build -t wakanda/residuos:latest -f src/gestion_residuos/Dockerfile src
docker build -t wakanda/seguridad:latest -f src/gestion_vigilancia/Dockerfile src
docker build -t wakanda/usuarios:latest -f src/gestion_usuarios/Dockerfile src
docker build -t wakanda/gateway:latest -f src/gateway_api/Dockerfile src
docker build -t wakanda/frontend:latest wakanda_frontend

echo "--------------------------------------------------------"
echo "Imágenes construidas correctamente."
echo "--------------------------------------------------------"

echo "--------------------------------------------------------"
echo "Desplegando infraestructura en Kubernetes..."
echo "--------------------------------------------------------"

kubectl apply -f k8s/config-secrets.yaml
kubectl apply -f k8s/infraestructure.yaml

echo "--------------------------------------------------------"
echo "Aplicando permisos de Administrador (RBAC)..."
echo "--------------------------------------------------------"
kubectl apply -f k8s/gateway-rbac.yaml

echo "--------------------------------------------------------"
echo "Esperando 20s a que la Base de Datos esté lista..."
echo "--------------------------------------------------------"
sleep 20

echo "--------------------------------------------------------"
echo "Desplegando microservicios y accesos..."
echo "--------------------------------------------------------"
kubectl apply -f k8s/microservices.yaml
kubectl apply -f k8s/acces.yaml

echo "--------------------------------------------------------"
echo "Reiniciando Gateway para asegurar permisos..."
echo "--------------------------------------------------------"
kubectl rollout restart deployment ms-gateway

echo "--------------------------------------------------------"
echo "DESPLIEGUE COMPLETADO DESDE CERO. VERIFICANDO ESTADO..."
echo "--------------------------------------------------------"
sleep 10
kubectl get pods
