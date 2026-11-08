#!/bin/bash
set -e

RESOURCE_GROUP=${1:-"rg-taskapp"}
ACR_NAME=${2:-"taskappregistry"}
CONTAINER_APP_NAME=${3:-"task-backend-app"}
IMAGE_NAME="task-management-backend"
TAG="latest"
IMAGE_URI="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${TAG}"

echo "1. Iniciando sesión en Azure CLI..."
az login

echo "2. Autenticando con Azure Container Registry (ACR)..."
az acr login --name "$ACR_NAME"

echo "3. Compilando la imagen Docker para producción..."
docker build -t "$IMAGE_URI" .

echo "4. Subiendo la imagen a ACR..."
docker push "$IMAGE_URI"

echo "5. Actualizando Azure Container Apps..."
az containerapp update \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE_URI"

echo "¡Despliegue completado con éxito en Azure!"
