import { ImportMapper } from "@/components/ImportMapper";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Import</h1>
          <p className="text-muted-foreground">
            Importieren Sie Leads aus XLSX oder CSV Dateien
          </p>
        </div>
      </div>
      <ImportMapper />
    </div>
  );
}
