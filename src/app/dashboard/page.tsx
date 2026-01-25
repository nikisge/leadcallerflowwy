import { Dashboard } from "@/components/Dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Übersicht und Statistiken
          </p>
        </div>
      </div>
      <Dashboard />
    </div>
  );
}
