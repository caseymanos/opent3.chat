# Testing Guide for T3 Clone Tier System

## Pre-Flight Checks

Before starting the development server, always run:
```bash
npm run predev
```

This will check:
- All dependencies are installed
- Environment variables are configured
- Critical files exist
- Basic syntax validation

## Available Test Commands

### 1. Test Dependencies
```bash
npm run test:deps
```
Verifies all required packages are installed.

### 2. Test All Tiers
```bash
npm run test:all-tiers
```
Checks configuration for all tier providers:
- Vertex AI (Anonymous users)
- Azure OpenAI (Logged-in users)
- Anthropic (Special tier)
- Environment variables

### 3. Test Vertex AI
```bash
npm run test:vertex-ai
```
Specifically tests Vertex AI configuration and credentials.

## Manual Testing Steps

### 1. Anonymous User Testing
1. Open the app in an incognito/private window
2. Try to use a Vertex AI model (Gemini 2.5 Flash)
3. Verify you can make up to 10 calls
4. Verify other models show "Sign in required"

### 2. Logged-in User Testing
1. Sign in to the app
2. Test GPT-4o-mini (18 calls/day limit)
3. Test Claude 4 Sonnet (2 calls/day limit)
4. Verify usage counter updates correctly

### 3. BYOK Testing
1. Enable BYOK in settings
2. Add your OpenRouter API key
3. Verify all models become available
4. Verify usage shows "Unlimited"

## Common Issues and Fixes

### Module Not Found Errors
```bash
# Run dependency check
npm run test:deps

# Install missing packages
npm install
```

### Syntax Errors
```bash
# Format code
npx prettier --write src/**/*.{ts,tsx}

# Type check
npx tsc --noEmit
```

### Environment Variable Issues
```bash
# Check current config
npm run test:all-tiers

# Copy example and update
cp .env.example .env.local
# Then edit .env.local with your API keys
```

## Provider-Specific Testing

### Vertex AI
- Requires: Google Cloud project with billing
- Test with: Anonymous access to Gemini models
- Verify: 10 calls/day limit enforced

### Azure OpenAI
- Requires: Azure resource with GPT-4o-mini deployment
- Test with: Logged-in user access
- Verify: Uses deployment name from env

### Anthropic
- Requires: Valid Anthropic API key (sk-ant-...)
- Test with: Claude 4 Sonnet model
- Verify: 2 calls/day limit for logged-in users

## Automated Testing

Run all tests in sequence:
```bash
npm run test:deps && npm run test:all-tiers && npm run predev
```

## Production Readiness Checklist

- [ ] All dependencies installed (`npm run test:deps`)
- [ ] Environment variables configured (`npm run test:all-tiers`)
- [ ] Database migrations applied
- [ ] Pre-flight checks pass (`npm run predev`)
- [ ] Manual testing completed for all tiers
- [ ] Error handling tested (invalid keys, network issues)
- [ ] Usage tracking verified in database