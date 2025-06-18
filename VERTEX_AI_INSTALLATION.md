# Vertex AI Provider Installation

## Install Required Dependencies

To use the Vertex AI provider, you need to install the Google Vertex AI SDK:

```bash
npm install @ai-sdk/google-vertex
```

## Verify Installation

After installation, run the test script to verify your configuration:

```bash
npm run test:vertex-ai
```

This will check:
- Environment variables are properly set
- Service account credentials are valid
- Provider can be initialized successfully

## Complete Setup

For complete setup instructions, including:
- Creating a Google Cloud project
- Setting up service accounts
- Configuring environment variables

See [VERTEX_AI_SETUP.md](./VERTEX_AI_SETUP.md)