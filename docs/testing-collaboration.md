# Testing Collaborative Features

## Quick Test Methods

### 1. Multiple Browser Windows/Tabs
The easiest way to test collaboration features:

1. Open the app in multiple browser windows or tabs
2. Navigate to the same conversation ID in each window
3. Start typing in one window - you should see typing indicators in others
4. The collaborative features are currently in demo mode, so you'll see simulated activity

### 2. Different Browsers
For a more realistic test:
- Open the app in Chrome
- Open the same conversation in Firefox/Safari
- This simulates different users better than just tabs

### 3. Incognito/Private Windows
- Open one regular window
- Open one or more incognito/private windows
- Each will have a separate session

## Current Collaborative Features

### ✅ Working Features:
1. **Live Participant List** - Shows active users in the conversation
2. **Typing Indicators** - Shows when someone is typing
3. **Simulated Cursors** - Demo mode shows random cursor movements
4. **Participant Avatars** - Color-coded user indicators

### 🚧 Demo/Simulated Features:
The current implementation uses demo data to showcase collaborative features:
- Simulated cursors appear randomly every 10 seconds
- Mock participants are shown
- Typing indicators work but are session-based

## Testing Scenarios

### Test 1: Typing Indicators
1. Open 2 browser windows with the same conversation
2. Start typing in one window
3. You should see "typing..." indicator in the other window
4. Stop typing - indicator should disappear after 3 seconds

### Test 2: Participant List
1. Open multiple windows
2. Look at the participant avatars in the header
3. You should see color-coded circles for each "participant"

### Test 3: Cursor Movements
1. Wait about 10 seconds in any conversation
2. You should see animated cursors appear occasionally
3. These are simulated to demonstrate the UI

## Enable Real Collaboration

To enable real multi-user collaboration, you would need to:

1. **Set up Supabase Realtime**
```sql
-- Enable realtime for collaborative tables
ALTER TABLE live_cursors REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE message_annotations REPLICA IDENTITY FULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE live_cursors;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
```

2. **Implement Authentication**
- Replace demo user with real Supabase Auth
- Each user gets their own ID and profile

3. **Update the Collaborative Hook**
- Replace mock data with real Supabase subscriptions
- Implement actual cursor position tracking
- Add real-time message synchronization

## Quick Demo Commands

To quickly see collaborative features in action:

```bash
# Terminal 1 - Start the app
npm run dev

# Terminal 2 - Open multiple browser instances (macOS)
open -n -a "Google Chrome" http://localhost:3003
open -n -a "Google Chrome" http://localhost:3003

# Or use different browsers
open -a "Google Chrome" http://localhost:3003
open -a "Firefox" http://localhost:3003
open -a "Safari" http://localhost:3003
```

## Debugging Collaboration

Check the console for collaborative events:
- Look for messages starting with 🔄 [Collaborative]
- Check for typing status updates: ⌨️ [Collaborative]
- Monitor cursor updates: 📍 [Collaborative]

The app logs all collaborative actions to help with debugging.