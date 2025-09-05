import { jest } from "@jest/globals";
import {
  createPoll,
  editPoll,
  getPolls,
  deletePoll,
  getPollById,
  castVote,
  signOutAction,
  getSupabaseServerClientForActions,
} from "@/lib/actions";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Mock implementations
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signOut: jest.fn(),
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
    throw new Error("REDIRECT"); // Simulate redirect behavior
  });
});

describe("getSupabaseServerClientForActions", () => {
  it("should create a server client with proper configuration", async () => {
    await getSupabaseServerClientForActions();

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

describe("createPoll", () => {
  const validPollData = {
    question: "What is your favorite color?",
    options: [{ value: "Red" }, { value: "Blue" }, { value: "Green" }],
    starts_at: new Date("2024-01-01"),
    ends_at: new Date("2024-01-31"),
  };

  it("should create a poll successfully", async () => {
    const mockUser = { user: { id: "user-123" } };
    const mockPoll = { id: "poll-123", question: validPollData.question };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    // Mock poll creation
    const pollInsertMock = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockPoll, error: null }),
      }),
    };

    // Mock options creation
    const optionsInsertMock = jest.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnValue(pollInsertMock),
      })
      .mockReturnValueOnce({ insert: optionsInsertMock });

    await expect(createPoll(validPollData)).rejects.toThrow("REDIRECT");
    expect(revalidatePath).toHaveBeenCalledWith("/polls");
  });

  it("should throw error for invalid poll data", async () => {
    const invalidPollData = {
      question: "", // Invalid: empty question
      options: [], // Invalid: no options
    };

    await expect(createPoll(invalidPollData)).rejects.toThrow();
  });

  it("should throw error when user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    await expect(createPoll(validPollData)).rejects.toThrow(
      "User not authenticated.",
    );
  });

  it("should handle database errors when creating poll", async () => {
    const mockUser = { user: { id: "user-123" } };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    const pollInsertMock = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    };

    mockSupabaseClient.from.mockReturnValue({
      insert: jest.fn().mockReturnValue(pollInsertMock),
    });

    await expect(createPoll(validPollData)).rejects.toThrow(
      "Could not create poll: Database error",
    );
  });
});

describe("editPoll", () => {
  const validPollData = {
    question: "Updated question?",
    options: [{ value: "Option A" }, { value: "Option B" }],
    starts_at: new Date("2024-01-01"),
    ends_at: new Date("2024-01-31"),
  };

  it("should edit a poll successfully", async () => {
    const mockUser = { user: { id: "user-123" } };
    const existingOptions = [
      { id: "opt-1", value: "Option A" },
      { id: "opt-2", value: "Old Option" },
    ];

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    // Mock poll update
    const pollUpdateMock = {
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    };

    // Mock existing options fetch
    const selectMock = {
      eq: jest.fn().mockResolvedValue({
        data: existingOptions,
        error: null,
      }),
    };

    // Mock options insert
    const insertMock = jest.fn().mockResolvedValue({ error: null });

    // Mock options delete
    const deleteMock = {
      in: jest.fn().mockResolvedValue({ error: null }),
    };

    mockSupabaseClient.from
      .mockReturnValueOnce({
        update: jest.fn().mockReturnValue(pollUpdateMock),
      })
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue(selectMock) })
      .mockReturnValueOnce({ insert: insertMock })
      .mockReturnValueOnce({ delete: jest.fn().mockReturnValue(deleteMock) });

    await expect(editPoll("poll-123", validPollData)).rejects.toThrow(
      "REDIRECT",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/polls");
  });

  it("should throw error when user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    await expect(editPoll("poll-123", validPollData)).rejects.toThrow(
      "User not authenticated.",
    );
  });
});

describe("getPolls - Unauthenticated Access", () => {
  it("should fetch polls successfully for unauthenticated users", async () => {
    const mockPolls = [
      {
        id: "poll-1",
        question: "Test question 1",
        options: [
          { id: "opt-1", value: "Option 1" },
          { id: "opt-2", value: "Option 2" },
        ],
      },
    ];

    // Mock polls query
    const selectMock = {
      order: jest.fn().mockResolvedValue({ data: mockPolls, error: null }),
    };

    // Mock vote count queries for each option
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
    expect(result[0].id).toBe("poll-1");
    expect(result[0].options[0]).toHaveProperty("vote_count");
  });

  it("should handle database errors", async () => {
    const selectMock = {
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    };

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue(selectMock),
    });

    await expect(getPolls()).rejects.toThrow(
      "Could not fetch polls: Database error",
    );
  });
});

describe("deletePoll", () => {
  it("should delete poll successfully", async () => {
    const mockUser = { user: { id: "user-123" } };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    const deleteMock = {
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockSupabaseClient.from.mockReturnValue({
      delete: jest.fn().mockReturnValue(deleteMock),
    });

    await expect(deletePoll("poll-123")).rejects.toThrow("REDIRECT");
    expect(revalidatePath).toHaveBeenCalledWith("/polls");
  });

  it("should throw error when user is not authenticated", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    await expect(deletePoll("poll-123")).rejects.toThrow(
      "User not authenticated.",
    );
  });
});

describe("getPollById - Unauthenticated Access", () => {
  it("should fetch poll by ID successfully for unauthenticated users", async () => {
    const mockPoll = {
      id: "poll-1",
      question: "Test question",
      options: [{ id: "opt-1", value: "Option 1" }],
    };

    // Mock poll query
    const pollSelectMock = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockPoll, error: null }),
      }),
    };

    // Mock vote count query
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

  it("should handle poll not found", async () => {
    const pollSelectMock = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "Poll not found" },
        }),
      }),
    };

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue(pollSelectMock),
    });

    await expect(getPollById("nonexistent-poll")).rejects.toThrow(
      "Could not fetch poll: Poll not found",
    );
  });

  it("should return null for missing poll data", async () => {
    const pollSelectMock = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue(pollSelectMock),
    });

    const result = await getPollById("poll-1");
    expect(result).toBeNull();
  });
});

describe("castVote", () => {
  // Use valid UUID format for tests
  const validOptionId = "550e8400-e29b-41d4-a716-446655440000";
  const validPollId = "550e8400-e29b-41d4-a716-446655440001";

  const formData = new FormData();
  formData.append("optionId", validOptionId);
  formData.append("pollId", validPollId);

  it("should cast vote successfully", async () => {
    const mockUser = { user: { id: "user-123" } };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    // Mock existing vote check (no existing vote)
    const existingVoteSelectMock = {
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: "PGRST116" }, // No rows found
          }),
        }),
      }),
    };

    // Mock poll data check
    const pollSelectMock = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { starts_at: null, ends_at: null },
          error: null,
        }),
      }),
    };

    // Mock vote insert
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
    expect(revalidatePath).toHaveBeenCalledWith(`/polls/${validPollId}`);
  });

  it("should prevent duplicate voting", async () => {
    const mockUser = { user: { id: "user-123" } };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
      error: null,
    });

    // Mock existing vote check (vote exists)
    const existingVoteSelectMock = {
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
      select: jest.fn().mockReturnValue(existingVoteSelectMock),
    });

    const result = await castVote(null, formData);

    expect(result).toEqual({ error: "You have already voted in this poll." });
  });

  it("should prevent voting on inactive polls", async () => {
    const mockUser = { user: { id: "user-123" } };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
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

    // Mock poll with future start date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const pollSelectMock = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            starts_at: futureDate.toISOString(),
            ends_at: null,
          },
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

    expect(result).toEqual({ error: "This poll has not started yet." });
  });

  it("should handle unauthenticated user", async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await castVote(null, formData);

    expect(result).toEqual({ error: "User not authenticated." });
  });

  it("should handle invalid form data", async () => {
    // Mock unauthenticated user to avoid auth check
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const invalidFormData = new FormData();
    // Missing required fields - will fail validation

    const result = await castVote(null, invalidFormData);

    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty(
      "message",
      "Missing Fields. Failed to cast vote.",
    );
  });

  it("should handle voting on ended polls", async () => {
    const mockUser = { user: { id: "user-123" } };
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: mockUser,
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

    // Mock poll with past end date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const pollSelectMock = {
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            starts_at: null,
            ends_at: pastDate.toISOString(),
          },
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

    expect(result).toEqual({ error: "This poll has already ended." });
  });
});

describe("signOutAction", () => {
  it("should sign out user successfully", async () => {
    const signOutMock = jest.fn().mockResolvedValue({});
    mockSupabaseClient.auth.signOut = signOutMock;

    await expect(signOutAction()).rejects.toThrow("REDIRECT");
    expect(signOutMock).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(redirect).toHaveBeenCalledWith("/signin");
  });
});
