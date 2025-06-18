# Vertex AI Provider Setup

This guide explains how to configure the Vertex AI provider for Google's Gemini models.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with billing enabled
3. Vertex AI API enabled in your project

## Setup Steps

### 1. Enable Vertex AI API

```bash
# Using gcloud CLI
gcloud services enable aiplatform.googleapis.com
```

Or enable it through the [Google Cloud Console](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com).

### 2. Create a Service Account

1. Go to the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Name it (e.g., "vertex-ai-access")
4. Grant the role: "Vertex AI User" or "Vertex AI Administrator"
5. Create and download the JSON key file

### 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Required: GCP Project ID
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional: Region (defaults to us-central1)
GOOGLE_CLOUD_LOCATION=us-central1

# Option 1: Service account key as JSON string
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Option 2: Path to service account key file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Available Models

The Vertex AI provider supports these Gemini models:

- **gemini-2.5-flash-vertex**: Enterprise-grade Gemini with enhanced security
- **gemini-2.5-flash-lite-vertex**: Lightweight model optimized for cost and speed

## Model Mapping

The provider automatically maps model names:

- `gemini-2.5-flash` → `gemini-2.0-flash-001`
- `gemini-2.5-flash-lite` → `gemini-2.0-flash-002`
- `gemini-2.0-flash` → `gemini-2.0-flash-001`
- `gemini-1.5-flash` → `gemini-1.5-flash-001`
- `gemini-1.5-pro` → `gemini-1.5-pro-001`

## Usage

Once configured, select a Vertex AI model from the model selector in the chat interface. These models are marked as "BYOK" (Bring Your Own Key) and require proper authentication.

## Troubleshooting

### Authentication Errors

1. Verify your service account has the correct permissions
2. Check that the JSON key is properly formatted
3. Ensure the project ID matches your GCP project

### API Not Enabled

If you see "API not enabled" errors:
```bash
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
```

### Region Issues

Some models may not be available in all regions. Try using `us-central1` if you encounter availability issues.

## Security Best Practices

1. Never commit service account keys to version control
2. Use environment variables or secret management services
3. Apply the principle of least privilege to service account permissions
4. Rotate service account keys regularly

## Pricing

Vertex AI pricing varies by model and region. Check the [Vertex AI pricing page](https://cloud.google.com/vertex-ai/pricing) for current rates.