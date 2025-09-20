import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const createPollFormSchema = z.object({
  question: z.string().min(5, {
    message: "Question must be at least 5 characters.",
  }),
  options: z
    .array(
      z.object({
        value: z.string().min(1, {
          message: "Option cannot be empty.",
        }),
      })
    )
    .min(2, {
      message: "Please add at least 2 options.",
    })
    .refine(
      (options) => {
        const values = options.map((option) => option.value);
        return new Set(values).size === values.length;
      },
      {
        message: "Options must be unique.",
        path: ["options"],
      },
    ),
  starts_at: z.coerce.date().nullable().optional(),
  ends_at: z.coerce.date().nullable().optional(),
}).refine((data) => {
  if (data.starts_at && data.ends_at) {
    return data.ends_at > data.starts_at;
  }
  return true;
}, {
  message: "End date must be after start date.",
  path: ["ends_at"],
});

export const castVoteFormSchema = z.object({
  optionId: z.string().uuid({ message: "Invalid option ID" }),
  pollId: z.string().uuid({ message: "Invalid poll ID" }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CreatePollFormInput = z.infer<typeof createPollFormSchema>;


