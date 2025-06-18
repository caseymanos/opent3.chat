# Anonymous User Vertex AI Access Fix

## Problem
Anonymous users were getting an error "Anonymous users can only use Vertex AI models" when trying to chat, even though Vertex AI models were available.

## Root Cause
1. The default model was set to `gemini-2.5-flash-preview-05-20` (Google provider, free tier)
2. Anonymous users are restricted to models with BOTH `tier: 'vertex-ai'` AND `provider: 'vertex-ai'`
3. The UI wasn't defaulting to the correct model for anonymous users

## Solution Implemented

### 1. Updated ChatInterface Default Model Logic
```typescript
// Before
const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-preview-05-20')
const [selectedProvider, setSelectedProvider] = useState('google')

// After
const [selectedModel, setSelectedModel] = useState(() => {
  return isAnonymous ? 'gemini-2.5-flash-vertex' : 'gemini-2.5-flash-preview-05-20'
})
const [selectedProvider, setSelectedProvider] = useState(() => {
  return isAnonymous ? 'vertex-ai' : 'google'
})
```

### 2. Added Auth Status Change Handler
```typescript
useEffect(() => {
  if (isAnonymous && selectedModel === 'gemini-2.5-flash-preview-05-20') {
    setSelectedModel('gemini-2.5-flash-vertex')
    setSelectedProvider('vertex-ai')
  }
}, [isAnonymous, selectedModel])
```

### 3. Updated ModelSelector Provider Ordering
- Anonymous users see Vertex AI provider first in the dropdown
- Logged-in users see providers in the standard order
- Added proper icons and colors for all providers

### 4. Enhanced Provider Support
Added missing provider icons and colors:
- Vertex AI: ☁️ (Cloud icon)
- Azure: 🔷 
- Azure AI: 🌟
- xAI: 🚀

## Testing
Created test script: `scripts/test-anonymous-flow.js`

Run with: `node scripts/test-anonymous-flow.js`

## Expected Behavior
1. **Anonymous Users**:
   - Default model: `gemini-2.5-flash-vertex`
   - Vertex AI models appear first in dropdown
   - Can make 10 calls/day
   - Other models show "Sign in required"

2. **Logged-in Users**:
   - Default model: `gemini-2.5-flash-preview-05-20`
   - All tiers available based on usage
   - Standard provider ordering

## Verification
The app now correctly:
- ✅ Defaults to Vertex AI models for anonymous users
- ✅ Shows Vertex AI models prominently for anonymous users
- ✅ Allows anonymous users to chat with Vertex AI models
- ✅ Enforces 10 calls/day limit for anonymous users