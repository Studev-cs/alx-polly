"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircledIcon, MinusCircledIcon } from "@radix-ui/react-icons";
import { createPollFormSchema, CreatePollFormInput } from "@/lib/validators";
import { toast } from "sonner";
import { Poll } from "@/lib/types";

interface EditPollFormProps {
  poll: Poll;
  editPollAction: (pollId: string, values: CreatePollFormInput) => Promise<void>;
}

export function EditPollForm({ poll, editPollAction }: EditPollFormProps) {
  const form = useForm<CreatePollFormInput>({
    resolver: zodResolver(createPollFormSchema),
    defaultValues: {
      question: poll.question,
      options: poll.options ? poll.options.map((opt) => ({ value: opt.value })) : [{ value: "" }, { value: "" }],
      starts_at: poll.starts_at ? new Date(poll.starts_at) : new Date(),
      ends_at: poll.ends_at ? new Date(poll.ends_at) : undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  async function onSubmit(values: CreatePollFormInput) {
    try {
      await editPollAction(poll.id, values);
      toast.success("Poll updated successfully!");
    } catch (error: any) {
      try {
        const errors = JSON.parse(error.message);
        for (const [field, messages] of Object.entries(errors)) {
          form.setError(field as keyof CreatePollFormInput, {
            type: "server",
            message: (messages as string[]).join(", "),
          });
        }
      } catch (parseError) {
        form.setError("root.serverError", {
          type: "server",
          message: error.message,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit poll</CardTitle>
          <CardDescription>
            Edit your poll question and options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="What's your question?"
                {...form.register("question")}
              />
              {form.formState.errors.question && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.question.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts At (Optional)</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                {...form.register("starts_at", { valueAsDate: true })}
              />
              {form.formState.errors.starts_at && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.starts_at.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends At (Optional)</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                {...form.register("ends_at", { valueAsDate: true })}
              />
              {form.formState.errors.ends_at && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.ends_at.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    {...form.register(`options.${index}.value`)}
                  />
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <MinusCircledIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {form.formState.errors.options && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.options.message}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ value: "" })}
              className="mt-2"
            >
              <PlusCircledIcon className="mr-2 h-4 w-4" /> Add Option
            </Button>
            <Button type="submit" variant="default">Save Changes</Button>
            {form.formState.errors.root?.serverError?.message && (
              <p className="text-sm text-red-500 mt-2">
                {form.formState.errors.root.serverError.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

