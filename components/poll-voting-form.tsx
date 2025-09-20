"use client";

import React, { useState, useEffect, useTransition, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Poll } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

interface PollVotingFormProps {
  poll: Poll;
  currentUser: { id: string } | null;
  isActive: boolean;
  hasVotedInitial: boolean;
  votedOptionId: string | null; // New prop
}

interface CastVoteState {
  error?: string;
  success?: boolean;
  message?: string;
  errors?: { [key: string]: string[] };
}

export default memo(function PollVotingForm({
  poll,
  currentUser,
  isActive,
  hasVotedInitial,
  votedOptionId,
}: PollVotingFormProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    votedOptionId,
  ); // Initialize with votedOptionId
  const [hasVotedLocally, setHasVotedLocally] = useState(hasVotedInitial);
  const [isPending, startTransition] = useTransition();
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('anonymousId');
    if (!id) {
      id = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('anonymousId', id);
      document.cookie = `anonymousId=${id}; path=/; max-age=${60 * 60 * 24 * 365}`; // Set cookie for 1 year
    }
    setAnonymousId(id);
  }, []);

  const disableVoting = !isActive || hasVotedLocally || isPending;

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption) {
      toast.error("Please select an option to vote.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/polls/${poll.id}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-anonymous-id": anonymousId || "",
          },
          body: JSON.stringify({ optionId: selectedOption }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to cast vote");
        }

        toast.success(result.message);
        setHasVotedLocally(true);
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {poll.options &&
        poll.options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <Input
              type="radio"
              id={option.id}
              name="optionId"
              value={option.id}
              className="w-4 h-4"
              onChange={handleOptionChange}
              checked={selectedOption === option.id}
              disabled={disableVoting}
            />
            <Label htmlFor={option.id} className="text-lg font-medium">
              {option.value} ({option.vote_count || 0} votes)
            </Label>
          </div>
        ))}
      <input type="hidden" name="pollId" value={poll.id} />
      {isActive && !hasVotedLocally ? (
        <Button
          type="submit"
          variant="default"
          className="mt-4"
          disabled={disableVoting}
        >
          {isPending ? "Casting Vote..." : "Cast Vote"}
        </Button>
      ) : null}
      {!isActive && (
        <p className="text-muted-foreground">
          Voting is {poll.ends_at ? "closed" : "not yet open"}.
        </p>
      )}
      {hasVotedLocally && (
        <p className="text-green-500">Thank you for voting!</p>
      )}
      
    </form>
  );
});