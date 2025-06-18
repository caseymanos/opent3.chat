# User Traits & Export/Import Features

## Overview

This update adds two major features for signed-in users:
1. **User Traits**: Personalize AI responses by providing information about yourself
2. **Export/Import**: Backup and restore your conversation history

## Features

### User Traits
- Set your display name, occupation, and personality traits
- Add additional context about yourself
- AI models will tailor their responses based on your profile
- Toggle traits on/off per profile

### Export/Import Conversations
- Export all conversations as JSON files
- Includes messages, metadata, and user preferences
- Import conversations from previous backups
- Preserves conversation structure and branching

## Setup

1. **Apply Database Migration**:
   ```bash
   # Option 1: Use the setup script
   node scripts/apply-user-preferences-migration.js
   
   # Option 2: Apply manually in Supabase SQL editor
   # Copy contents of: supabase/migrations/20250119_user_preferences.sql
   ```

2. **Access Settings**:
   - Sign in to your account
   - Click the Settings button in the header
   - Navigate to "Profile & Traits" or "Export/Import History"

## Usage

### Setting Up Your Profile
1. Go to Settings → Profile & Traits
2. Enter your name and occupation
3. Add personality traits (friendly, witty, concise, etc.)
4. Add any additional context
5. Save your preferences

### Exporting Conversations
1. Go to Settings → Export/Import History
2. Click "Export All Conversations"
3. A JSON file will download with all your data

### Importing Conversations
1. Go to Settings → Export/Import History
2. Click or drag a JSON file to the import area
3. Click "Import Conversations"
4. Your conversations will be restored

## Technical Details

### Database Schema
```sql
user_preferences
├── id (UUID)
├── user_id (UUID, references profiles)
├── display_name (TEXT)
├── occupation (TEXT)
├── personality_traits (TEXT[])
├── additional_context (TEXT)
├── model_instructions (JSONB)
├── export_settings (JSONB)
├── traits_enabled (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### Export Format
```json
{
  "version": "1.0",
  "exported_at": "2025-01-19T...",
  "user": {
    "id": "...",
    "email": "...",
    "preferences": { ... }
  },
  "conversations": [
    {
      "id": "...",
      "title": "...",
      "messages": [ ... ],
      "model_provider": "...",
      "model_name": "...",
      "created_at": "..."
    }
  ],
  "stats": {
    "total_conversations": 10,
    "total_messages": 150
  }
}
```

### System Prompt Integration
When traits are enabled, they're added to the AI system prompt:
```
User Context:
- Name: [Your Name]
- Role: [Your Occupation]
- Traits: [friendly, witty, etc.]
- Additional Context: [Your custom text]

Please tailor your responses considering these user characteristics.
```

## Privacy & Security

- All data is stored securely in your Supabase account
- Traits are only sent to AI models during your conversations
- Export files are generated locally in your browser
- Import validation prevents malformed data
- Row Level Security ensures only you can access your data