#!/bin/bash
# Automated AWS ECR deployment

AWS_ACCOUNT_ID=${1:-"your-aws-account-id"}
REGION=${2:-"eu-west-1"}
REPO_NAME="task-management-backend"
IMAGE_TAG="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:latest"

echo "==> Authenticating Docker with AWS ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

echo "==> Building the Docker image..."
docker build -t ${REPO_NAME} .
docker tag ${REPO_NAME}:latest ${IMAGE_TAG}

echo "==> Pushing the image to AWS ECR..."
docker push ${IMAGE_TAG}

echo "==> Image pushed successfully. Update your ECS Fargate service to use the new image."
