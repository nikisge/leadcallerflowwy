"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Phone,
  ArrowUpDown,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { LEAD_STATUSES, PRODUKTE, type Lead } from "@/lib/types";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface LeadTableProps {
  onSelectForCall?: (leads: Lead[]) => void;
}

export function LeadTable({ onSelectForCall }: LeadTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [brancheFilter, setBrancheFilter] = useState<string>("");
  const [produktFilter, setProduktFilter] = useState<string>("");
  const [branchen, setBranchen] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");

  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        sortBy,
        sortOrder,
      });

      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (brancheFilter) params.set("branche", brancheFilter);
      if (produktFilter) params.set("produkt", produktFilter);

      const response = await fetch(`/api/leads?${params}`);
      if (!response.ok) {
        throw new Error("API error");
      }
      const data = await response.json();

      setLeads(data.leads || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      toast({
        title: "Fehler",
        description: "Leads konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, statusFilter, brancheFilter, produktFilter, toast]);

  const fetchBranchen = async () => {
    try {
      const response = await fetch("/api/leads/branchen");
      if (!response.ok) return;
      const data = await response.json();
      setBranchen(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchBranchen();
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchLeads();
      toast({ title: "Status aktualisiert" });
    } catch {
      toast({
        title: "Fehler",
        description: "Status konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const handleProduktChange = async (leadId: string, newProdukt: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkt: newProdukt || null }),
      });
      fetchLeads();
      toast({ title: "Produkt aktualisiert" });
    } catch {
      toast({
        title: "Fehler",
        description: "Produkt konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const handleSaveNote = async (leadId: string) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notizen: editingNoteValue }),
      });
      setEditingNoteId(null);
      fetchLeads();
      toast({ title: "Notiz gespeichert" });
    } catch {
      toast({
        title: "Fehler",
        description: "Notiz konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("Lead wirklich löschen?")) return;
    try {
      await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      fetchLeads();
      toast({ title: "Lead gelöscht" });
    } catch {
      toast({
        title: "Fehler",
        description: "Lead konnte nicht gelöscht werden",
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    try {
      await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          update: { status: newStatus },
        }),
      });
      setSelectedIds(new Set());
      fetchLeads();
      toast({ title: `${selectedIds.size} Leads aktualisiert` });
    } catch {
      toast({
        title: "Fehler",
        description: "Leads konnten nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const handleAddToCallQueue = () => {
    const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
    if (onSelectForCall) {
      onSelectForCall(selectedLeads);
    }
    // Store in localStorage for call page
    localStorage.setItem("callQueue", JSON.stringify(selectedLeads));
    toast({
      title: `${selectedLeads.length} Leads zur Anruf-Warteschlange hinzugefügt`,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = LEAD_STATUSES.find((s) => s.value === status);
    return (
      <Badge className={statusInfo?.color || "bg-gray-100 text-gray-800"}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter || "__all__"}
          onValueChange={(v) => {
            setStatusFilter(v === "__all__" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Status</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={brancheFilter || "__all__"}
          onValueChange={(v) => {
            setBrancheFilter(v === "__all__" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Branche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Branchen</SelectItem>
            {branchen.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={produktFilter || "__all__"}
          onValueChange={(v) => {
            setProduktFilter(v === "__all__" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Produkt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Produkte</SelectItem>
            {PRODUKTE.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedIds.size} ausgewählt
          </span>
          <Select onValueChange={handleBulkStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status ändern" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddToCallQueue} variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Zur Anruf-Liste
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Auswahl aufheben
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    leads.length > 0 && selectedIds.size === leads.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("firmenname")}
              >
                <div className="flex items-center gap-1">
                  Firma
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Ansprechpartner</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Branche</TableHead>
              <TableHead>Ort</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Produkt</TableHead>
              <TableHead>Notizen</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("anrufVersuche")}
              >
                <div className="flex items-center gap-1">
                  Anrufe
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  Laden...
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center py-8 text-muted-foreground"
                >
                  Keine Leads gefunden
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(lead.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {lead.firmenname}
                  </TableCell>
                  <TableCell>
                    {lead.anrede && `${lead.anrede} `}
                    {lead.ansprechpartner}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`tel:${lead.telefon}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.telefon}
                    </a>
                  </TableCell>
                  <TableCell>{lead.branche || "-"}</TableCell>
                  <TableCell>{lead.ort || "-"}</TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => handleStatusChange(lead.id, v)}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue>{getStatusBadge(lead.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.produkt || "__none__"}
                      onValueChange={(v) => handleProduktChange(lead.id, v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-</SelectItem>
                        {PRODUKTE.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {editingNoteId === lead.id ? (
                      <div className="flex items-center gap-1">
                        <Textarea
                          value={editingNoteValue}
                          onChange={(e) => setEditingNoteValue(e.target.value)}
                          className="min-h-[60px] text-sm"
                        />
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleSaveNote(lead.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setEditingNoteId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 cursor-pointer group"
                        onClick={() => {
                          setEditingNoteId(lead.id);
                          setEditingNoteValue(lead.notizen || "");
                        }}
                      >
                        <span className="truncate text-sm">
                          {lead.notizen || "-"}
                        </span>
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span>{lead.anrufVersuche}</span>
                      {lead.letzterAnruf && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(lead.letzterAnruf), "dd.MM", {
                            locale: de,
                          })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            localStorage.setItem(
                              "callQueue",
                              JSON.stringify([lead])
                            );
                            window.location.href = "/call";
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Anrufen
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(lead.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Seite {page} von {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
