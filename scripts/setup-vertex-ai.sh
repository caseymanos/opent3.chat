#!/bin/bash

echo "=== Vertex AI Setup Script ==="
echo

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    echo "❌ No GCP project selected. Please run:"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📍 Current GCP Project: $CURRENT_PROJECT"
echo

# Enable Vertex AI API
echo "🔧 Enabling Vertex AI API..."
gcloud services enable aiplatform.googleapis.com

echo
echo "✅ Vertex AI API enabled!"
echo

# Create service account
echo "👤 Creating service account for Vertex AI..."
SERVICE_ACCOUNT_NAME="vertex-ai-chat"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${CURRENT_PROJECT}.iam.gserviceaccount.com"

# Check if service account already exists
if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" &>/dev/null; then
    echo "   Service account already exists: $SERVICE_ACCOUNT_EMAIL"
else
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --display-name="Vertex AI Chat Service Account" \
        --description="Service account for T3 Clone chat app to access Vertex AI"
    echo "   Created service account: $SERVICE_ACCOUNT_EMAIL"
fi

echo
echo "🔐 Granting Vertex AI permissions..."
gcloud projects add-iam-policy-binding "$CURRENT_PROJECT" \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/aiplatform.user" \
    --quiet

echo
echo "🔑 Creating service account key..."
KEY_FILE="vertex-ai-key.json"
gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SERVICE_ACCOUNT_EMAIL"

echo
echo "✅ Setup complete!"
echo
echo "📋 Next steps:"
echo "1. Copy the contents of $KEY_FILE"
echo "2. Add to your .env.local file:"
echo
echo "# Vertex AI Configuration"
echo "GOOGLE_CLOUD_PROJECT=$CURRENT_PROJECT"
echo "GOOGLE_CLOUD_LOCATION=us-central1"
echo "GOOGLE_VERTEX_AI_CREDENTIALS=<paste-json-here>"
echo
echo "⚠️  IMPORTANT: Keep $KEY_FILE secure and don't commit it to git!"
echo "   Add it to .gitignore if needed."