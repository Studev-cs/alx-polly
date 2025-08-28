import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewPollPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a new poll</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input id="question" placeholder="What's your question?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="option1">Option 1</Label>
              <Input id="option1" placeholder="First option" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="option2">Option 2</Label>
              <Input id="option2" placeholder="Second option" />
            </div>
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


