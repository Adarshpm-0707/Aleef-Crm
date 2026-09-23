/**
 * app/(employee)/employee/work-upload/page.tsx
 *
 * Work Uploading — Submit deliverables, code packages, reports,
 * and design assets linked to client projects.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  FileCode,
  FileSpreadsheet,
  Palette,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentEmployee } from "@/lib/permissions/employee";
import {
  deliverablesApi,
  clientsApi,
  tasksApi,
  type WorkDeliverable,
  type Client,
  type Task,
} from "@/lib/api";

function WorkUploadContent() {
  const { employee } = useCurrentEmployee();
  const searchParams = useSearchParams();
  const initialTaskId = searchParams.get("taskId") || "";
  const initialClientId = searchParams.get("clientId") || "";

  const [deliverables, setDeliverables] = useState<WorkDeliverable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(initialClientId);
  const [taskId, setTaskId] = useState(initialTaskId);
  const [category, setCategory] = useState<WorkDeliverable["category"]>("documentation");
  const [version, setVersion] = useState("v1.0.0");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [empDeliverables, allClients, empTasks] = await Promise.all([
          deliverablesApi.getAll({ employeeUserId: employee.userId }),
          clientsApi.getAll(),
          tasksApi.getAll({ assigneeId: employee.userId }),
        ]);

        setDeliverables(empDeliverables);
        setClients(allClients);
        setTasks(empTasks);

        setClientId((prev) => (prev ? prev : (allClients[0]?.id ?? "")));
      } catch (err) {
        console.error("Failed to load deliverables data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [employee.userId]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a deliverable title");
      return;
    }

    setUploading(true);
    try {
      const fileName = selectedFile ? selectedFile.name : `${title.toLowerCase().replace(/\s+/g, "-")}.zip`;
      const fileSize = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : "4.2 MB";

      const created = await deliverablesApi.create({
        client_id: clientId,
        task_id: taskId || undefined,
        uploaded_by: employee.userId,
        title: title.trim(),
        category,
        file_name: fileName,
        file_size: fileSize,
        file_url: "#",
        version: version.trim() || "v1.0.0",
        notes: notes.trim() || undefined,
        status: "pending_review",
      });

      setDeliverables((prev) => [created, ...prev]);
      setTitle("");
      setNotes("");
      setSelectedFile(null);
      toast.success("Deliverable uploaded successfully and queued for client review!");
    } catch {
      toast.error("Failed to upload deliverable");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDeliverable = async (id: string) => {
    try {
      await deliverablesApi.delete(id);
      setDeliverables((prev) => prev.filter((d) => d.id !== id));
      toast.success("Deliverable record removed");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const filteredDeliverables = deliverables.filter((d) => {
    const matchCat = categoryFilter === "all" || d.category === categoryFilter;
    const matchClient = clientFilter === "all" || d.client_id === clientFilter;
    return matchCat && matchClient;
  });

  const getCategoryIcon = (cat: WorkDeliverable["category"]) => {
    switch (cat) {
      case "source_code":
        return <FileCode className="h-4 w-4 text-emerald-400" />;
      case "design":
        return <Palette className="h-4 w-4 text-purple-400" />;
      case "report":
        return <FileSpreadsheet className="h-4 w-4 text-amber-400" />;
      default:
        return <FileText className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <UploadCloud className="h-6 w-6 text-indigo-400" />
          Work Uploading & Deliverables
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload completed code packages, reports, design files, and documentation for client review
        </p>
      </div>

      {/* Main Upload Box & Repository Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Col: Upload Form */}
        <div className="rounded-2xl border border-indigo-500/20 bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Upload New Deliverable
          </h2>

          <form onSubmit={handleSubmitUpload} className="space-y-3.5">
            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-500/40 bg-indigo-500/5 p-6 text-center hover:border-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer"
            >
              <input
                type="file"
                id="file-upload-input"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="h-8 w-8 text-indigo-400 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                {selectedFile ? selectedFile.name : "Drag & drop files here or click to browse"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Supports ZIP, PDF, PPTX, DOCX, PNG, MP4 up to 100MB
              </p>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Deliverable Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Telemetry Ingestion Service v1.2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Client & Task dropdowns */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Target Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Linked Task (Optional)</label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer truncate"
              >
                <option value="">-- None / General Project Work --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Category & Version */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WorkDeliverable["category"])}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="source_code">Source Code</option>
                  <option value="documentation">Documentation</option>
                  <option value="report">Report / Data</option>
                  <option value="design">UI/UX Asset</option>
                  <option value="presentation">Presentation</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Version Tag</label>
                <input
                  type="text"
                  placeholder="v1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Release Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Release Notes & Remarks</label>
              <textarea
                rows={2}
                placeholder="What was updated, test instructions, or notes for client review..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              {uploading ? "Uploading Deliverable..." : "Publish Deliverable"}
            </button>
          </form>
        </div>

        {/* Right 2 Cols: Deliverables Repository */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              Submitted Deliverables Repository
            </h2>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="source_code">Source Code</option>
                <option value="documentation">Documentation</option>
                <option value="report">Report</option>
                <option value="presentation">Presentation</option>
              </select>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:border-indigo-500 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card">
              Loading deliverables...
            </div>
          ) : filteredDeliverables.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground rounded-xl border border-border bg-card p-8">
              No deliverables found matching your criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeliverables.map((deliv) => (
                <div
                  key={deliv.id}
                  className="rounded-xl border border-border bg-card p-4.5 shadow-sm hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(deliv.category)}
                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide">
                          {deliv.category.replace("_", " ")}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                          {deliv.version}
                        </span>
                        {deliv.client && (
                          <span className="text-xs font-semibold text-foreground/80">
                            • {deliv.client.company_name}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-foreground">{deliv.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        File: <strong className="font-mono text-foreground">{deliv.file_name}</strong> ({deliv.file_size})
                      </p>
                      {deliv.notes && <p className="text-xs text-muted-foreground pt-1">{deliv.notes}</p>}
                    </div>

                    <div className="flex items-center gap-3 sm:flex-shrink-0 self-end sm:self-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                          deliv.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {deliv.status === "approved" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {deliv.status === "approved" ? "Approved" : "In Review"}
                      </span>

                      <button
                        type="button"
                        onClick={() => toast.info(`Downloading ${deliv.file_name}...`)}
                        className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDeliverable(deliv.id)}
                        className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                        title="Delete deliverable"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkUploadingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
          <p className="text-sm text-muted-foreground animate-pulse">Loading deliverable workspace...</p>
        </div>
      }
    >
      <WorkUploadContent />
    </React.Suspense>
  );
}
