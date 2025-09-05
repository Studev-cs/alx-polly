# Unauthenticated Access Feature

This document describes the unauthenticated access functionality implemented in the ALX Polly application, allowing users to view and explore polls without requiring authentication.

## Overview

The application has been refactored to support two types of users:
- **Authenticated users**: Can create, edit, delete, and vote on polls
- **Unauthenticated users**: Can view all polls, see results, but cannot vote or manage polls

## Features for Unauthenticated Users

### ✅ What Unauthenticated Users Can Do

1. **View All Polls** (`/polls`)
   - Browse all available polls
   - See poll questions and options
   - View vote counts and percentages
   - Access poll charts and visualizations

2. **View Individual Polls** (`/polls/[id]`)
   - See detailed poll information
   - View poll status (active, ended, not started)
   - See comprehensive vote results with charts
   - Access poll timing information

3. **Navigation**
   - Browse the site freely
   - Access public poll pages
   - Use the responsive navigation menu

### ❌ What Unauthenticated Users Cannot Do

1. **Poll Management**
   - Cannot create new polls
   - Cannot edit existing polls
   - Cannot delete polls

2. **Voting**
   - Cannot cast votes on any polls
   - Will see a sign-in prompt when attempting to vote

3. **User-Specific Features**
   - Cannot access authenticated-only routes
   - Cannot see "Create poll" buttons or edit/delete options for polls they don't own

## Architecture Changes

### Route Structure

The application now uses a nested route structure:

```
app/
├── (polls)/
│   ├── layout.tsx                 # Public layout (no auth required)
│   ├── polls/
│   │   ├── page.tsx              # Public polls list
│   │   └── [id]/
│   │       └── page.tsx          # Public poll details
│   └── (authenticated)/
│       ├── layout.tsx            # Auth-required layout
│       ├── new/
│       │   └── page.tsx          # Create poll (auth required)
│       └── [id]/
│           └── edit/
│               └── page.tsx      # Edit poll (auth required)
```

### Key Components

1. **Public Layout** (`/app/(polls)/layout.tsx`)
   - No authentication checks
   - Provides consistent container styling
   - Allows access to all users

2. **Authenticated Layout** (`/app/(polls)/(authenticated)/layout.tsx`)
   - Requires user authentication
   - Redirects unauthenticated users to sign-in
   - Protects poll creation and editing routes

3. **Enhanced Poll Voting Form** (`/components/poll-voting-form.tsx`)
   - Shows appropriate UI for both user types
   - Displays sign-in prompt for unauthenticated users
   - Maintains full functionality for authenticated users

## User Experience

### For Unauthenticated Users

1. **Landing on Polls Page**
   - Sees "All polls" instead of "Your polls"
   - No "Create poll" button visible
   - Can click on any poll to view details

2. **Viewing Individual Polls**
   - Can see all poll information
   - Poll options are visible but disabled
   - Clear call-to-action to sign in for voting
   - Results chart is fully accessible

3. **Attempting to Vote**
   - Sees a friendly message: "You need to be signed in to vote in this poll"
   - Provided with "Sign In" and "Sign Up" buttons
   - Smooth transition to authentication flow

### For Authenticated Users

- Full access to all previous functionality
- Can create, edit, delete, and vote on polls
- See personalized "Your polls" heading
- Access to all management features

## Testing

The application includes comprehensive tests covering both authenticated and unauthenticated scenarios:

```bash
# Run tests
npm test

# Test coverage includes:
# - Unauthenticated poll viewing (getPolls, getPollById)
# - Authenticated poll management (createPoll, editPoll, deletePoll)
# - Voting with various user states (castVote)
# - Authentication flows and error handling
```

### Test Categories

1. **Unauthenticated Access Tests**
   - Fetching polls without authentication
   - Viewing individual polls without sign-in
   - Proper error handling for missing data

2. **Authenticated Feature Tests**
   - Poll creation, editing, and deletion
   - Voting functionality
   - User session management

3. **Mixed Scenario Tests**
   - Same data access for different user types
   - Proper UI state management
   - Security boundary enforcement

## Security Considerations

1. **Data Access**
   - Poll viewing is public by design
   - No sensitive user data exposed to unauthenticated users
   - Vote counts are aggregated and anonymized

2. **Route Protection**
   - Authentication-required routes are properly protected
   - Server-side validation for all write operations
   - Client-side UI adapts based on authentication state

3. **API Security**
   - All write operations require authentication
   - Read operations are public but don't expose sensitive data
   - Proper error handling without information leakage

## Implementation Benefits

1. **User Engagement**
   - Lower barrier to entry for new users
   - Users can explore content before committing to sign up
   - Improved conversion funnel

2. **SEO & Discovery**
   - Public poll pages can be indexed by search engines
   - Better content discoverability
   - Increased organic traffic potential

3. **Developer Experience**
   - Clean separation of concerns
   - Maintainable route structure
   - Comprehensive test coverage
   - Clear user state management

## Future Enhancements

Potential improvements for unauthenticated user experience:

1. **Enhanced Discovery**
   - Poll categories and filtering
   - Search functionality
   - Trending polls section

2. **Social Features**
   - Share poll results
   - Public poll statistics
   - Poll performance metrics

3. **Progressive Enhancement**
   - Save poll preferences locally
   - Bookmark interesting polls
   - Pre-fill registration forms with poll context

## Migration Notes

If upgrading from a previous version:

1. **Route Changes**
   - Update any hardcoded references to `/polls/new` → `/new`
   - Update edit poll links from `/polls/[id]/edit` → `/[id]/edit`

2. **Component Updates**
   - Poll voting form now handles both user states
   - Navbar adapts to authentication status
   - Layout components simplified

3. **Testing**
   - New test suites for unauthenticated access
   - Updated mocks for proper authentication state handling
   - Comprehensive coverage for mixed scenarios

---

This feature significantly improves the accessibility and user experience of the ALX Polly application while maintaining security and functionality for authenticated users.