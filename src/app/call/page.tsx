import { CallQueue } from "@/components/CallQueue";

export default function CallPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Anrufen</h1>
          <p className="text-muted-foreground">
            Arbeiten Sie Ihre Anruf-Warteschlange ab
          </p>
        </div>
      </div>
      <CallQueue />
    </div>
  );
}
