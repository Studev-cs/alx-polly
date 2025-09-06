# Actions Migration Guide

This guide helps you migrate from the monolithic `actions.ts` file to the new modular action structure.

## Overview

The original `lib/actions.ts` file has been split into focused modules for better maintainability, testability, and organization. The new structure provides:

- **Better separation of concerns**
- **Enhanced testability** with focused test suites
- **Improved code discoverability**
- **Clear security boundaries**
- **Easier feature additions**

## New Structure

```
lib/
├── actions/
│   ├── index.ts                    # Main exports (use this for imports)
│   ├── shared/
│   │   └── supabase-client.ts      # Shared utilities
│   ├── auth.ts                     # Authentication actions
│   ├── poll-management.ts          # Create/Edit/Delete polls (auth required)
│   ├── poll-data.ts               # Read polls (public access)
│   └── voting.ts                  # Voting actions (auth required)
└── actions.ts                     # Legacy file (kept for compatibility)
```

## Migration Steps

### 1. Update Import Statements

**Before:**
```typescript
import { createPoll, editPoll, getPolls, castVote, signOutAction } from "@/lib/actions";
```

**After (Recommended):**
```typescript
import { createPoll, editPoll, getPolls, castVote, signOutAction } from "@/lib/actions";
// OR for more specific imports:
import { createPoll, editPoll } from "@/lib/actions/poll-management";
import { getPolls, getPollById } from "@/lib/actions/poll-data";
import { castVote } from "@/lib/actions/voting";
import { signOutAction } from "@/lib/actions/auth";
```

### 2. Update Supabase Client Usage

**Before:**
```typescript
import { getSupabaseServerClientForActions } from "@/lib/actions";
const supabase = await getSupabaseServerClientForActions();
```

**After:**
```typescript
import { getSupabaseServerClient } from "@/lib/actions";
const supabase = await getSupabaseServerClient();
```

### 3. Use New Helper Functions

The new structure provides enhanced utilities:

```typescript
import { getCurrentUser, requireAuth } from "@/lib/actions";

// Get current user (returns null if not authenticated)
const user = await getCurrentUser();

// Require authentication (throws error if not authenticated)
const user = await requireAuth();
```

## Module Details

### Authentication Actions (`auth.ts`)

**Functions:**
- `signOutAction()` - Signs out user and redirects
- `getCurrentSession()` - Gets current session
- `refreshSession()` - Refreshes user session

**Usage:**
```typescript
import { signOutAction, getCurrentSession } from "@/lib/actions/auth";
```

### Poll Data Actions (`poll-data.ts`)

**Functions:**
- `getPolls()` - Fetch all polls (public)
- `getPollById(id)` - Fetch single poll (public)
- `getPollsByUser(userId)` - Fetch user's polls
- `isPollActive(poll)` - Check if poll is active
- `getPollStatus(poll)` - Get detailed poll status
- `getPollStats(poll)` - Get poll statistics

**Usage:**
```typescript
import { getPolls, isPollActive, getPollStats } from "@/lib/actions/poll-data";

const polls = await getPolls();
const isActive = isPollActive(poll);
const stats = getPollStats(poll);
```

### Poll Management Actions (`poll-management.ts`)

**Functions:**
- `createPoll(data)` - Create new poll (auth required)
- `editPoll(id, data)` - Update poll (auth + ownership required)
- `deletePoll(id)` - Delete poll (auth + ownership required)
- `duplicatePoll(id, newQuestion?)` - Duplicate poll
- `validatePollOwnership(pollId, userId?)` - Check poll ownership

**Usage:**
```typescript
import { createPoll, editPoll, validatePollOwnership } from "@/lib/actions/poll-management";

await createPoll(pollData);
const isOwner = await validatePollOwnership(pollId);
```

### Voting Actions (`voting.ts`)

**Functions:**
- `castVote(prevState, formData)` - Cast a vote (auth required)
- `hasUserVoted(pollId, userId?)` - Check if user voted
- `getUserVote(pollId, userId?)` - Get user's vote
- `removeVote(pollId)` - Remove user's vote
- `changeVote(pollId, optionId)` - Change vote to different option
- `getUserVotingStats(userId?)` - Get user voting statistics

**Usage:**
```typescript
import { castVote, hasUserVoted, getUserVote } from "@/lib/actions/voting";

const hasVoted = await hasUserVoted(pollId);
const userVote = await getUserVote(pollId);
```

### Shared Utilities (`shared/supabase-client.ts`)

**Functions:**
- `getSupabaseServerClient()` - Get configured Supabase client
- `getCurrentUser()` - Get current authenticated user or null
- `requireAuth()` - Get user or throw authentication error

## Testing Changes

### New Test Structure

Each module now has focused tests:

```bash
npm test actions-modular  # Test new modular structure
npm test actions         # Test legacy compatibility
npm test                # Run all tests
```

### Test Coverage

- **49 total tests** across both structures
- **28 tests** for new modular actions
- **21 tests** for legacy compatibility
- Coverage for authenticated and unauthenticated scenarios

## Benefits of New Structure

### 1. Better Organization

```typescript
// Clear context-based imports
import { signOutAction } from "@/lib/actions/auth";
import { createPoll } from "@/lib/actions/poll-management";
import { getPolls } from "@/lib/actions/poll-data";
import { castVote } from "@/lib/actions/voting";
```

### 2. Enhanced Security

- **Clear authentication boundaries**
- **Separate public and authenticated actions**
- **Centralized auth utilities**

### 3. Improved Testability

- **Module-specific test files**
- **Better mock isolation**
- **Focused test scenarios**

### 4. Better Developer Experience

- **Autocomplete shows relevant functions**
- **Smaller, focused files**
- **Clear function purposes**

## New Features

The modular structure introduces several new utility functions:

### Poll Status Helpers

```typescript
import { isPollActive, getPollStatus, getPollStats } from "@/lib/actions/poll-data";

// Check if poll accepts votes
const active = isPollActive(poll);

// Get detailed status
const status = getPollStatus(poll);
// Returns: { active: boolean, status: 'active' | 'ended' | 'not-started', message: string }

// Get statistics
const stats = getPollStats(poll);
// Returns: { totalVotes, totalOptions, options: Array<{votes, percentage}> }
```

### Advanced Voting Features

```typescript
import { hasUserVoted, getUserVote, removeVote, changeVote } from "@/lib/actions/voting";

// Check voting status
const hasVoted = await hasUserVoted(pollId);
const userChoice = await getUserVote(pollId);

// Manage votes (for future features)
await removeVote(pollId);
await changeVote(pollId, newOptionId);
```

### Poll Management Utilities

```typescript
import { duplicatePoll, validatePollOwnership } from "@/lib/actions/poll-management";

// Duplicate a poll
const newPollId = await duplicatePoll(originalPollId, "New Question");

// Check ownership
const isOwner = await validatePollOwnership(pollId);
```

## Backward Compatibility

The original `lib/actions.ts` file remains unchanged, and all imports continue to work:

```typescript
// This still works exactly as before
import { createPoll, getPolls, castVote } from "@/lib/actions";
```

All tests pass, ensuring no breaking changes.

## Migration Checklist

- [ ] **Review imports** - Update to use new structure where beneficial
- [ ] **Update Supabase client calls** - Change `getSupabaseServerClientForActions` to `getSupabaseServerClient`
- [ ] **Consider new utilities** - Use helper functions like `getCurrentUser()` and `requireAuth()`
- [ ] **Run tests** - Ensure your code works with both structures
- [ ] **Update documentation** - Reference new module structure in your docs

## Future Enhancements

The modular structure makes it easy to add new features:

- **Analytics actions** for poll performance tracking
- **Admin actions** for moderation
- **Social features** for sharing and discovery
- **Real-time actions** for live poll updates

---

This migration maintains full backward compatibility while providing a more maintainable and feature-rich foundation for future development.