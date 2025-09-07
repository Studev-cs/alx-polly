import { jest } from "@jest/globals";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Import all the new modular actions
import { signOutAction, getCurrentSession } from "@/lib/actions/auth";
import { getPolls, getPollById } from "@/lib/actions/poll-data";
import { createPoll, validatePollOwnership } from "@/lib/actions/poll-management";
import { castVote, hasUserVoted, getUserVote } from "@/lib/actions/voting";
import { getCurrentUser, requireAuth } from "@/lib/actions/shared/supabase-client";

declare global {
  var mockSupabase: any;
}

describe("Shared Utilities", () => {
  describe("getCurrentUser", () => {
    it("should return user when authenticated", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      const result = await getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    it("should return null when not authenticated", async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const result = await getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe("requireAuth", () => {
    it("should return user when authenticated", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      const result = await requireAuth();
      expect(result).toEqual(mockUser);
    });

    it("should throw error when not authenticated", async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      // Corrected: The actual error message is "Authentication required"
      await expect(requireAuth()).rejects.toThrow("Authentication required");
    });
  });
});

describe("Authentication Actions", () => {
  describe("signOutAction", () => {
    it("should sign out user and redirect", async () => {
      await expect(signOutAction()).rejects.toThrow("REDIRECT");
    });
  });

  describe("getCurrentSession", () => {
    it("should return session when available", async () => {
      const mockSession = { user: { id: "user-123" } };
      global.mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession } });
      const result = await getCurrentSession();
      expect(result).toEqual(mockSession);
    });
  });
});

describe("Poll Data Actions", () => {
  describe("getPolls", () => {
    it("should fetch and format polls successfully", async () => {
      const mockPolls = [{ id: "poll-1", question: "Test question?", options: [] }];
      global.mockSupabase.rpc.mockResolvedValue({ data: mockPolls, error: null });
      const result = await getPolls();
      expect(result).toEqual(mockPolls);
    });
  });

  describe("getPollById", () => {
    it("should fetch poll by ID successfully", async () => {
      const mockPoll = { id: "poll-1", question: "Test question?", options: [] };
      global.mockSupabase.rpc.mockReturnValue({ single: jest.fn().mockResolvedValue({ data: mockPoll, error: null }) });
      const result = await getPollById("poll-1");
      expect(result).toEqual(mockPoll);
    });
  });
});

describe("Poll Management Actions", () => {
  describe("createPoll", () => {
    it("should throw error when not authenticated", async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const validPollData = { question: "A valid question?", options: [{ value: "Option 1" }, { value: "Option 2" }] };
      await expect(createPoll(validPollData)).rejects.toThrow("Authentication required");
    });
  });

  describe("validatePollOwnership", () => {
    it("should return true for poll owner", async () => {
      const mockUser = { id: "user-123" };
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      global.mockSupabase.single.mockResolvedValue({ data: { user_id: "user-123" }, error: null });
      const result = await validatePollOwnership("poll-123");
      expect(result).toBe(true);
    });
  });
});

describe("Voting Actions", () => {
  describe("castVote", () => {
    it("should handle already voted error", async () => {
      const mockUser = { id: "user-123" };
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      // This mock implementation is crucial. It handles the multiple database calls inside castVote.
      global.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'votes') {
          // This is for the hasUserVoted check. We want it to return true (a vote exists).
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'some-vote-id' }, error: null }) };
        }
        if (table === 'polls') {
          // This is for the poll status check. We want it to return an active poll.
          return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { id: 'poll-1', ends_at: null }, error: null }) };
        }
        return { from: jest.fn() };
      });

      const formData = new FormData();
      formData.append("pollId", "poll-1");

      const result = await castVote(null, formData);
      expect(result.error).toBe("You have already voted in this poll.");
    });
  });

  describe("hasUserVoted", () => {
    it("should return true when user has voted", async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      global.mockSupabase.single.mockResolvedValue({ data: { id: "vote-id" }, error: null });
      const result = await hasUserVoted("poll-123");
      expect(result).toBe(true);
    });

    it("should return false when user has not voted", async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      global.mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await hasUserVoted("poll-123");
      expect(result).toBe(false);
    });
  });

  describe("getUserVote", () => {
    it("should return option ID when user has voted", async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      global.mockSupabase.single.mockResolvedValue({ data: { option_id: "option-456" }, error: null });
      const result = await getUserVote("poll-123");
      expect(result).toBe("option-456");
    });
  });
});