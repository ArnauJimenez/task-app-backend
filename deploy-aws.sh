#!/bin/bash
# Script de automatización de despliegue en AWS ECR

AWS_ACCOUNT_ID=${1:-"tu-aws-account-id"}
REGION=${2:-"eu-west-1"}
REPO_NAME="task-management-backend"
IMAGE_TAG="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest"

echo "==> Autenticando Docker con AWS ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

echo "==> Construyendo la imagen de Docker..."
docker build -t ${REPO_NAME} .
docker tag ${REPO_NAME}:latest ${IMAGE_TAG}

echo "==> Subiendo la imagen a AWS ECR..."
docker push ${IMAGE_TAG}

echo "==> Imagen subida con éxito. Actualiza tu servicio en ECS Fargate para usar la nueva imagen."
