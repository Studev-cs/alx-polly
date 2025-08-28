import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PollDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Poll {id}</CardTitle>
        </CardHeader>
        <CardContent>
          Poll details and voting UI will go here.
        </CardContent>
      </Card>
    </div>
  );
}


