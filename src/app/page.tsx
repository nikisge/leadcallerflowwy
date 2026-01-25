import { LeadTable } from "@/components/LeadTable";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leads</h1>
      </div>
      <LeadTable />
    </div>
  );
}
