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
import { formatDateForInput } from "@/lib/utils";
import { toast } from "sonner";

interface CreatePollFormClientProps {
  createPollAction: (values: CreatePollFormInput) => Promise<void>;
}

export function CreatePollFormClient({ createPollAction }: CreatePollFormClientProps) {
  const form = useForm<CreatePollFormInput>({
    resolver: zodResolver(createPollFormSchema),
    defaultValues: {
      question: "",
      options: [{ value: "" }, { value: "" }],
      starts_at: new Date(),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  async function onSubmit(values: CreatePollFormInput) {
    try {
      await createPollAction(values);
      toast.success("Poll created successfully!");
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
        // If the error message is not a JSON string, display a general error
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
          <CardTitle>Create a new poll</CardTitle>
          <CardDescription>
            Create a new poll with a question and multiple options for users to
            vote on.
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
            <Button type="submit">Create Poll</Button>
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
