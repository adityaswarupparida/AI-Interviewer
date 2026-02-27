"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCopy, Plus, Loader2, ExternalLink } from "lucide-react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface Interview {
  id: string;
  candidate_name: string;
  role: string;
  status: string;
  invite_link: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "text-amber-400 bg-amber-400/10 border border-amber-400/20" },
  active:    { label: "Active",    className: "text-sky-400 bg-sky-400/10 border border-sky-400/20" },
  completed: { label: "Completed", className: "text-violet-400 bg-violet-400/10 border border-violet-400/20" },
  evaluated: { label: "Evaluated", className: "text-[#4ecba0] bg-[#4ecba0]/10 border border-[#4ecba0]/20" },
};

export default function Dashboard() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [newInviteLink, setNewInviteLink] = useState("");
  const [copied, setCopied]         = useState(false);
  const [form, setForm] = useState({
    candidate_name: "",
    candidate_email: "",
    role: "",
    job_description: "",
  });

  const fetchInterviews = () =>
    fetch(`${API}/api/interviews`)
      .then((r) => r.json())
      .then(setInterviews)
      .finally(() => setLoading(false));

  useEffect(() => { fetchInterviews(); }, []);

  const createInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setNewInviteLink("");
    try {
      const res = await fetch(`${API}/api/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setNewInviteLink(data.invite_link);
      setForm({ candidate_name: "", candidate_email: "", role: "", job_description: "" });
      fetchInterviews();
    } finally {
      setCreating(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="border-b border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-8 py-5 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl font-light tracking-wide text-[#e8e4dc]">
              AI Interviewer
            </h1>
            <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mt-1">
              Talent Assessment Platform
            </p>
          </div>
          {!loading && (
            <p className="text-[10px] text-[#6b7280] tracking-[0.12em] uppercase pb-0.5">
              {interviews.length} interview{interviews.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-8">

        {/* New Interview form */}
        <div className="bg-ink border border-white/[0.06] rounded-2xl p-7">
          <h2 className="font-display text-lg font-light text-[#e8e4dc] mb-5 flex items-center gap-2">
            <Plus size={15} className="text-[#6b7280]" />
            New Interview
          </h2>

          <form onSubmit={createInterview} className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Candidate name"
              className="col-span-1 bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-[#e8e4dc] placeholder:text-[#3d4a5c] focus:outline-none focus:border-white/20 transition-colors"
              value={form.candidate_name}
              onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="Candidate email"
              className="col-span-1 bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-[#e8e4dc] placeholder:text-[#3d4a5c] focus:outline-none focus:border-white/20 transition-colors"
              value={form.candidate_email}
              onChange={(e) => setForm({ ...form, candidate_email: e.target.value })}
            />
            <input
              required
              placeholder="Role (e.g. Senior Backend Engineer)"
              className="col-span-2 bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-[#e8e4dc] placeholder:text-[#3d4a5c] focus:outline-none focus:border-white/20 transition-colors"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
            <textarea
              required
              rows={4}
              placeholder="Paste the job description here..."
              className="col-span-2 bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-[#e8e4dc] placeholder:text-[#3d4a5c] focus:outline-none focus:border-white/20 transition-colors resize-none"
              value={form.job_description}
              onChange={(e) => setForm({ ...form, job_description: e.target.value })}
            />
            <button
              type="submit"
              disabled={creating}
              className="col-span-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] disabled:opacity-40 rounded-xl py-3 text-sm text-[#e8e4dc] tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {creating
                ? <><Loader2 size={13} className="animate-spin" /> Generating invite...</>
                : "Create Interview"
              }
            </button>
          </form>

          {newInviteLink && (
            <div className="mt-4 flex items-center gap-3 bg-[#4ecba0]/[0.05] border border-[#4ecba0]/20 rounded-xl px-4 py-3">
              <span className="text-xs text-[#4ecba0] flex-1 truncate tracking-wide">{newInviteLink}</span>
              <button onClick={() => copy(newInviteLink)} className="text-[#4ecba0]/50 hover:text-[#4ecba0] transition-colors" title="Copy link">
                <ClipboardCopy size={13} />
              </button>
              <a href={newInviteLink} target="_blank" rel="noopener noreferrer" className="text-[#4ecba0]/50 hover:text-[#4ecba0] transition-colors" title="Open in new tab">
                <ExternalLink size={13} />
              </a>
              {copied && <span className="text-[10px] text-[#4ecba0] tracking-[0.15em] uppercase">Copied</span>}
            </div>
          )}
        </div>

        {/* Interview list */}
        <div>
          <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-4">
            All Interviews
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={18} className="animate-spin text-[#6b7280]" />
            </div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/[0.05] rounded-2xl">
              <p className="text-sm text-[#6b7280] tracking-wide">No interviews yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {interviews.map((i) => {
                const sc = STATUS_CONFIG[i.status] ?? {
                  label: i.status,
                  className: "text-[#4b5563] bg-white/[0.03] border border-white/[0.06]",
                };
                return (
                  <div
                    key={i.id}
                    className="bg-ink border border-white/[0.06] hover:border-white/[0.11] rounded-xl px-6 py-4 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-sm text-[#e8e4dc]">{i.candidate_name}</p>
                      <p className="text-[11px] text-[#9ca3af] mt-0.5">{i.role}</p>
                      <p className="text-[10px] text-[#6b7280] mt-1.5 tracking-wide">
                        {new Date(i.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full tracking-[0.12em] uppercase ${sc.className}`}>
                        {sc.label}
                      </span>
                      {i.status === "evaluated" && (
                        <Link
                          href={`/report/${i.id}`}
                          className="text-[11px] text-[#9ca3af] hover:text-[#e8e4dc] tracking-wide transition-colors"
                        >
                          View Report
                        </Link>
                      )}
                      <button
                        onClick={() => copy(i.invite_link)}
                        className="text-[#6b7280] hover:text-[#e8e4dc] transition-colors"
                        title="Copy invite link"
                      >
                        <ClipboardCopy size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
