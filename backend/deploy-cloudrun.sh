#!/bin/bash
# Automated Google Cloud Run deployment

PROJECT_ID=${1:-"your-gcp-project-id"}
REGION=${2:-"europe-west1"}
SERVICE_NAME="task-management-backend"
REPO_NAME="task-app-repo"
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

echo "==> Authenticating Docker with Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

echo "==> Building the Docker image for GCP..."
docker build -t ${IMAGE_TAG} .

echo "==> Pushing the image to Artifact Registry..."
docker push ${IMAGE_TAG}

echo "==> Deploying to Google Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_TAG} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 3000

echo "==> Deployment completed successfully!"
