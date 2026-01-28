"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  FolderOpen,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Group } from "@/lib/types";

interface GroupListProps {
  onSelectGroup: (groupId: string | null) => void;
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export function GroupList({ onSelectGroup }: GroupListProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [ungroupedCount, setUngroupedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(COLORS[0]);

  const { toast } = useToast();

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setGroups(data.groups || []);
      setUngroupedCount(data.ungroupedCount || 0);
    } catch {
      toast({
        title: "Fehler",
        description: "Gruppen konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription || null,
          color: newGroupColor,
        }),
      });

      if (!response.ok) throw new Error();

      toast({ title: "Gruppe erstellt" });
      setDialogOpen(false);
      resetForm();
      fetchGroups();
    } catch {
      toast({
        title: "Fehler",
        description: "Gruppe konnte nicht erstellt werden",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;

    try {
      const response = await fetch(`/api/groups/${editingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription || null,
          color: newGroupColor,
        }),
      });

      if (!response.ok) throw new Error();

      toast({ title: "Gruppe aktualisiert" });
      setDialogOpen(false);
      setEditingGroup(null);
      resetForm();
      fetchGroups();
    } catch {
      toast({
        title: "Fehler",
        description: "Gruppe konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Gruppe "${group.name}" wirklich löschen? Die Leads bleiben erhalten.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      toast({ title: "Gruppe gelöscht" });
      fetchGroups();
    } catch {
      toast({
        title: "Fehler",
        description: "Gruppe konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewGroupName("");
    setNewGroupDescription("");
    setNewGroupColor(COLORS[0]);
  };

  const openEditDialog = (group: Group) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || "");
    setNewGroupColor(group.color);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lead-Gruppen</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingGroup(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Neue Gruppe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Gruppe bearbeiten" : "Neue Gruppe erstellen"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="z.B. Kampagne März 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Input
                  id="description"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Kurze Beschreibung..."
                />
              </div>
              <div className="space-y-2">
                <Label>Farbe</Label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewGroupColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        newGroupColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
              >
                {editingGroup ? "Speichern" : "Erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Ungrouped leads card */}
        {ungroupedCount > 0 && (
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
            onClick={() => onSelectGroup("ungrouped")}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#94a3b8" }}
                  >
                    <FolderOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">Ohne Gruppe</h3>
                    <p className="text-sm text-muted-foreground">
                      Nicht zugeordnete Leads
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{ungroupedCount} Leads</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group cards */}
        {groups.map((group) => (
          <Card
            key={group.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectGroup(group.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: group.color }}
                  >
                    <FolderOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(group);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{group._count?.leads || 0} Leads</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty state */}
        {groups.length === 0 && ungroupedCount === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Keine Gruppen</h3>
              <p className="text-muted-foreground mb-4">
                Erstelle eine Gruppe und importiere Leads.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
