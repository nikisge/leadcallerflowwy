"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LeadTable } from "@/components/LeadTable";
import { GroupList } from "@/components/GroupList";
import { ArrowLeft } from "lucide-react";

export default function HomePage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");

  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    if (groupId === "ungrouped") {
      setSelectedGroupName("Ohne Gruppe");
    } else if (groupId) {
      // Fetch group name
      fetch(`/api/groups/${groupId}`)
        .then((res) => res.json())
        .then((data) => setSelectedGroupName(data.name || "Gruppe"))
        .catch(() => setSelectedGroupName("Gruppe"));
    }
  };

  const handleBack = () => {
    setSelectedGroupId(null);
    setSelectedGroupName("");
  };

  return (
    <div className="space-y-6">
      {selectedGroupId ? (
        <>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <h1 className="text-2xl font-bold">{selectedGroupName}</h1>
          </div>
          <LeadTable groupId={selectedGroupId} />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Leads</h1>
          </div>
          <GroupList onSelectGroup={handleSelectGroup} />
        </>
      )}
    </div>
  );
}
