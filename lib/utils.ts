import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Poll } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Checks if a poll is currently active (between start and end dates)
 * @param poll - The poll to check
 * @returns Boolean indicating if poll is active
 */
export function isPollActive(poll: Poll): boolean {
  const now = new Date();
  const startsAt = poll.starts_at ? new Date(poll.starts_at) : null;
  const endsAt = poll.ends_at ? new Date(poll.ends_at) : null;

  const hasStarted = startsAt ? now >= startsAt : true;
  const hasNotEnded = endsAt ? now <= endsAt : true;

  return hasStarted && hasNotEnded;
}

/**
 * Gets poll status information
 * @param poll - The poll to analyze
 * @returns Status object with active state and description
 */
export function getPollStatus(poll: Poll) {
  const now = new Date();
  const startsAt = poll.starts_at ? new Date(poll.starts_at) : null;
  const endsAt = poll.ends_at ? new Date(poll.ends_at) : null;

  const hasStarted = startsAt ? now >= startsAt : true;
  const hasEnded = endsAt ? now > endsAt : false;

  if (!hasStarted) {
    return {
      active: false,
      status: "not-started" as const,
      message: "This poll has not started yet.",
    };
  }

  if (hasEnded) {
    return {
      active: false,
      status: "ended" as const,
      message: "This poll has ended.",
    };
  }

  return {
    active: true,
    status: "active" as const,
    message: "This poll is currently active.",
  };
}

/**
 * Gets basic poll statistics
 * @param poll - The poll to analyze
 * @returns Statistics object
 */
export function getPollStats(poll: Poll) {
  const totalVotes = poll.options.reduce(
    (sum, option) => sum + (option.vote_count || 0),
    0,
  );

  const optionStats = poll.options.map((option) => {
    const voteCount = option.vote_count || 0;
    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

    return {
      id: option.id,
      value: option.value,
      votes: voteCount,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    };
  });

  return {
    totalVotes,
    totalOptions: poll.options.length,
    options: optionStats,
  };
}