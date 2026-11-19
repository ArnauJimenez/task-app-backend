#!/bin/bash
# Script de automatización de despliegue en Google Cloud Run

PROJECT_ID=${1:-"tu-project-id-gcp"}
REGION=${2:-"europe-west1"}
SERVICE_NAME="task-management-backend"
REPO_NAME="task-app-repo"
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

echo "==> Autenticando Docker con Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

echo "==> Construyendo la imagen de Docker para GCP..."
docker build -t ${IMAGE_TAG} .

echo "==> Subiendo la imagen a Artifact Registry..."
docker push ${IMAGE_TAG}

echo "==> Desplegando en Google Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_TAG} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000

echo "==> ¡Despliegue completado con éxito!"
