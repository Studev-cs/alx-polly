// Authentication actions
export {
  signOutAction,
  getCurrentSession,
  refreshSession,
} from "./auth";

// Poll data actions (public access)
export {
  getPolls,
  getPollById,
  getPollsByUser,
} from "./poll-data";

// Poll management actions (authenticated)
export {
  createPoll,
  editPoll,
  deletePoll,
  duplicatePoll,
  archivePoll,
  restorePoll,
  validatePollOwnership,
} from "./poll-management";

// Voting actions (authenticated)
export {
  castVote,
  hasUserVoted,
  getUserVote,
  removeVote,
  changeVote,
  getUserVotingStats,
} from "./voting";

// Shared utilities
export {
  getSupabaseServerClient,
  getCurrentUser,
  requireAuth,
} from "./shared/supabase-client";

// Legacy compatibility - re-export with original names for migration
export { getSupabaseServerClient as getSupabaseServerClientForActions } from "./shared/supabase-client";
