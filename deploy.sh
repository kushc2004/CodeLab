#!/bin/bash

# Build and deploy script for Google Cloud Run

set -e

# Configuration
PROJECT_ID="your-project-id"  # Replace with your Google Cloud project ID
SERVICE_NAME="coding-platform"
REGION="us-central1"  # Change region as needed
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🏗️  Building Docker image..."
docker build -t ${IMAGE_NAME} .

echo "📤 Pushing image to Google Container Registry..."
docker push ${IMAGE_NAME}

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --port 3000 \
  --set-env-vars "NODE_ENV=production" \
  --project ${PROJECT_ID}

echo "✅ Deployment complete!"
echo "🔗 Service URL:"
gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)' --project ${PROJECT_ID}
