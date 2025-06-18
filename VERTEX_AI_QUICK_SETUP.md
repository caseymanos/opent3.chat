# Vertex AI Quick Setup Guide

## Option 1: Using the Setup Script

Run the provided setup script:
```bash
./scripts/setup-vertex-ai.sh
```

## Option 2: Manual Setup via Google Cloud Console

### 1. Enable Vertex AI API
1. Go to [Vertex AI API page](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)
2. Select your project
3. Click "Enable"

### 2. Create Service Account
1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Details:
   - Name: `vertex-ai-chat`
   - Description: `Service account for T3 Clone chat app`
4. Grant Role: `Vertex AI User`
5. Click "Done"

### 3. Create and Download Key
1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON"
5. Download the key file

### 4. Configure Environment Variables

Add to your `.env.local`:

```env
# Vertex AI Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_VERTEX_AI_CREDENTIALS={"type":"service_account","project_id":"...paste entire JSON content here..."}
```

**Important**: When pasting the JSON, make sure it's all on one line. You can use this command to format it:
```bash
cat your-key-file.json | jq -c '.'
```

Or manually ensure the JSON is on a single line.

## Testing Your Setup

Run:
```bash
npm run test:vertex-ai
```

This will verify your configuration is working correctly.

## Available Models

Once configured, you'll have access to:
- `gemini-2.5-flash-vertex` - Available for anonymous users (10 calls/day)
- `gemini-2.5-flash-lite-vertex` - Available for anonymous users (10 calls/day)

## Troubleshooting

### "API not enabled" error
Make sure you've enabled the Vertex AI API in your GCP project.

### Authentication errors
- Verify the service account has "Vertex AI User" role
- Check that the JSON is properly formatted (single line)
- Ensure the project ID in the JSON matches GOOGLE_CLOUD_PROJECT

### Region not available
Try changing GOOGLE_CLOUD_LOCATION to one of:
- `us-central1` (recommended)
- `us-east1`
- `europe-west4`
- `asia-northeast1`