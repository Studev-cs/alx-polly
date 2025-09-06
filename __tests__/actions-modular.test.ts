import { jest } from "@jest/globals";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Import all the new modular actions
import {
  signOutAction,
  getCurrentSession,
  refreshSession,
} from "@/lib/actions/auth";
import {
  getPolls,
  getPollById,
  getPollsByUser,
} from "@/lib/actions/poll-data";
import { isPollActive, getPollStatus, getPollStats } from "@/lib/utils";
import {
  createPoll,
  editPoll,
  deletePoll,
  duplicatePoll,
  validatePollOwnership,
} from "@/lib/actions/poll-management";
import {
  castVote,
  hasUserVoted,
  getUserVote,
  removeVote,
  changeVote,
  getUserVotingStats,
} from "@/lib/actions/voting";
import {
  getSupabaseServerClient,
  getCurrentUser,
  requireAuth,
} from "@/lib/actions/shared/supabase-client";

// Mock implementations
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    refreshSession: jest.fn(),
  },
  from: jest.fn(),
};

const mockCookies = {
  get: jest.fn(),
  set: jest.fn(),
};

// Setup mocks
beforeEach(() => {
  jest.clearAllMocks();
  (createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  (cookies as jest.Mock).mockResolvedValue(mockCookies);
  (revalidatePath as jest.Mock).mockImplementation(() => {});
  (redirect as jest.Mock).mockImplementation(() => {
    throw new Error("REDIRECT");
  });
});

describe("Shared Utilities", () => {
  describe("getSupabaseServerClient", () => {
    it("should create and return a server client", async () => {
      const client = await getSupabaseServerClient();
      expect(client).toBe(mockSupabaseClient);
      expect(createServerClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function),
          }),
        }),
      );
    });
  });

  describe("getCurrentUser", () => {
    it("should return user when authenticated", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    it("should return null when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe("requireAuth", () => {
    it("should return user when authenticated", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await requireAuth();
      expect(result).toEqual(mockUser);
    });

    it("should throw error when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      await expect(requireAuth()).rejects.toThrow("User not authenticated.");
    });
  });
});

describe("Authentication Actions", () => {
  describe("signOutAction", () => {
    it("should sign out user and redirect", async () => {
      const signOutMock = jest.fn().mockResolvedValue({});
      mockSupabaseClient.auth.signOut = signOutMock;

      await expect(signOutAction()).rejects.toThrow("REDIRECT");
      expect(signOutMock).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(redirect).toHaveBeenCalledWith("/signin");
    });
  });

  describe("getCurrentSession", () => {
    it("should return session when available", async () => {
      const mockSession = { user: { id: "user-123" }, access_token: "token" };
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await getCurrentSession();
      expect(result).toEqual(mockSession);
    });

    it("should return null when session unavailable", async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "No session" },
      });

      const result = await getCurrentSession();
      expect(result).toBeNull();
    });
  });
});

describe("Poll Data Actions", () => {
  describe("getPolls", () => {
    it("should fetch and format polls successfully", async () => {
      const mockPolls = [
        {
          id: "poll-1",
          question: "Test question",
          options: [
            { id: "opt-1", value: "Option 1" },
            { id: "opt-2", value: "Option 2" },
          ],
        },
      ];

      const selectMock = {
        order: jest.fn().mockResolvedValue({ data: mockPolls, error: null }),
      };

      const votesSelectMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 5 }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue(selectMock) })
        .mockReturnValue(votesSelectMock);

      const result = await getPolls();
      expect(result).toHaveLength(1);
      expect(result[0].options[0]).toHaveProperty("vote_count");
    });
  });

  describe("getPollById", () => {
    it("should fetch poll by ID successfully", async () => {
      const mockPoll = {
        id: "poll-1",
        question: "Test question",
        options: [{ id: "opt-1", value: "Option 1" }],
      };

      const pollSelectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      };

      const votesSelectMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 3 }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(pollSelectMock),
        })
        .mockReturnValue(votesSelectMock);

      const result = await getPollById("poll-1");
      expect(result).toBeDefined();
      expect(result?.id).toBe("poll-1");
      expect(result?.options[0]).toHaveProperty("vote_count", 3);
    });
  });

  describe("isPollActive", () => {
    it("should return true for active poll", () => {
      const poll = {
        id: "poll-1",
        question: "Test",
        starts_at: null,
        ends_at: null,
        options: [],
      };

      expect(isPollActive(poll)).toBe(true);
    });

    it("should return false for ended poll", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const poll = {
        id: "poll-1",
        question: "Test",
        starts_at: null,
        ends_at: yesterday.toISOString(),
        options: [],
      };

      expect(isPollActive(poll)).toBe(false);
    });
  });

  describe("getPollStatus", () => {
    it("should return active status for current poll", () => {
      const poll = {
        id: "poll-1",
        question: "Test",
        starts_at: null,
        ends_at: null,
        options: [],
      };

      const status = getPollStatus(poll);
      expect(status.active).toBe(true);
      expect(status.status).toBe("active");
    });

    it("should return ended status for past poll", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const poll = {
        id: "poll-1",
        question: "Test",
        starts_at: null,
        ends_at: yesterday.toISOString(),
        options: [],
      };

      const status = getPollStatus(poll);
      expect(status.active).toBe(false);
      expect(status.status).toBe("ended");
    });
  });

  describe("getPollStats", () => {
    it("should calculate poll statistics correctly", () => {
      const poll = {
        id: "poll-1",
        question: "Test",
        starts_at: null,
        ends_at: null,
        options: [
          { id: "opt-1", value: "Option 1", vote_count: 30 },
          { id: "opt-2", value: "Option 2", vote_count: 70 },
        ],
      };

      const stats = getPollStats(poll);
      expect(stats.totalVotes).toBe(100);
      expect(stats.totalOptions).toBe(2);
      expect(stats.options[0].percentage).toBe(30);
      expect(stats.options[1].percentage).toBe(70);
    });
  });
});

describe("Poll Management Actions", () => {
  describe("createPoll", () => {
    const validPollData = {
      question: "Test question?",
      options: [{ value: "Option A" }, { value: "Option B" }],
      starts_at: new Date("2024-01-01"),
      ends_at: new Date("2024-01-31"),
    };

    it("should create poll successfully", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockPoll = { id: "poll-123", question: validPollData.question };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const pollInsertMock = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockPoll, error: null }),
        }),
      };

      const optionsInsertMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue(pollInsertMock),
        })
        .mockReturnValueOnce({ insert: optionsInsertMock });

      await expect(createPoll(validPollData)).rejects.toThrow("REDIRECT");
      expect(revalidatePath).toHaveBeenCalledWith("/polls");
    });

    it("should throw error when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      await expect(createPoll(validPollData)).rejects.toThrow(
        "User not authenticated.",
      );
    });

    it("should throw error when there are less than 2 options", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const pollDataWithOneOption = {
        ...validPollData,
        options: [{ value: "Option A" }],
      };

      await expect(createPoll(pollDataWithOneOption)).rejects.toThrow();
    });
  });

  describe("editPoll", () => {
    const validPollData = {
      question: "Test question?",
      options: [{ value: "Option A" }, { value: "Option B" }],
      starts_at: new Date("2024-01-01"),
      ends_at: new Date("2024-01-31"),
    };

    it("should throw error when there are less than 2 options", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const pollDataWithOneOption = {
        ...validPollData,
        options: [{ value: "Option A" }],
      };

      await expect(editPoll("poll-123", pollDataWithOneOption)).rejects.toThrow();
    });
  });

  describe("validatePollOwnership", () => {
    it("should return true for poll owner", async () => {
      const mockUser = { id: "user-123" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const selectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "user-123" },
            error: null,
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const result = await validatePollOwnership("poll-123");
      expect(result).toBe(true);
    });

    it("should return false for non-owner", async () => {
      const mockUser = { id: "user-123" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const selectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: "different-user" },
            error: null,
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const result = await validatePollOwnership("poll-123");
      expect(result).toBe(false);
    });
  });
});

describe("Voting Actions", () => {
  const validOptionId = "550e8400-e29b-41d4-a716-446655440000";
  const validPollId = "550e8400-e29b-41d4-a716-446655440001";

  describe("castVote", () => {
    const formData = new FormData();
    formData.append("optionId", validOptionId);
    formData.append("pollId", validPollId);

    it("should cast vote successfully", async () => {
      const mockUser = { id: "user-123" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock no existing vote
      const existingVoteSelectMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      };

      // Mock active poll
      const pollSelectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { starts_at: null, ends_at: null },
            error: null,
          }),
        }),
      };

      const insertMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(existingVoteSelectMock),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(pollSelectMock),
        })
        .mockReturnValueOnce({ insert: insertMock });

      const result = await castVote(null, formData);
      expect(result).toEqual({
        success: true,
        message: "Vote cast successfully!",
      });
    });

    it("should not allow voting on a poll that has not started", async () => {
      const mockUser = { id: "user-123" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock no existing vote
      const existingVoteSelectMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pollSelectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { starts_at: tomorrow.toISOString(), ends_at: null },
            error: null,
          }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(existingVoteSelectMock),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(pollSelectMock),
        });

      const result = await castVote(null, formData);
      expect(result.error).toBe("This poll has not started yet.");
    });

    it("should not allow voting on a poll that has ended", async () => {
      const mockUser = { id: "user-123" };
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock no existing vote
      const existingVoteSelectMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      };

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const pollSelectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { starts_at: null, ends_at: yesterday.toISOString() },
            error: null,
          }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(existingVoteSelectMock),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(pollSelectMock),
        });

      const result = await castVote(null, formData);
      expect(result.error).toBe("This poll has already ended.");
    });
  });

  describe("hasUserVoted", () => {
    it("should return true when user has voted", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const selectMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: "vote-123" },
              error: null,
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const result = await hasUserVoted("poll-123");
      expect(result).toBe(true);
    });

    it("should return false when user has not voted", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const selectMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const result = await hasUserVoted("poll-123");
      expect(result).toBe(false);
    });

    it("should return false when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const result = await hasUserVoted("poll-123");
      expect(result).toBe(false);
    });
  });

  describe("getUserVote", () => {
    it("should return option ID when user has voted", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const selectMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { option_id: "option-456" },
              error: null,
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const result = await getUserVote("poll-123");
      expect(result).toBe("option-456");
    });

    it("should return null when user has not voted", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const selectMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const result = await getUserVote("poll-123");
      expect(result).toBeNull();
    });
  });

  describe("removeVote", () => {
    it("should remove vote successfully from active poll", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock active poll
      const pollSelectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { starts_at: null, ends_at: null },
            error: null,
          }),
        }),
      };

      const deleteMock = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue(pollSelectMock),
        })
        .mockReturnValueOnce({ delete: jest.fn().mockReturnValue(deleteMock) });

      const result = await removeVote("poll-123");
      expect(result).toEqual({
        success: true,
        message: "Vote removed successfully!",
      });
    });

    it("should not allow removing vote from ended poll", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const pollSelectMock = {
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { starts_at: null, ends_at: yesterday.toISOString() },
            error: null,
          }),
        }),
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue(pollSelectMock),
      });

      const result = await removeVote("poll-123");
      expect(result).toEqual({
        error: "Cannot change vote after poll has ended.",
      });
    });
  });

  describe("getUserVotingStats", () => {
    it("should return user voting statistics", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      // Mock vote count - needs proper chain structure
      const countSelectMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      };

      // Mock recent votes
      const recentVotesMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{ id: "vote-1", polls: { question: "Test poll" } }],
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(countSelectMock)
        .mockReturnValueOnce(recentVotesMock);

      const result = await getUserVotingStats();
      expect(result).toEqual({
        totalVotes: 5,
        recentVotes: [{ id: "vote-1", polls: { question: "Test poll" } }],
      });
    });
  });
});
