"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCopy, Plus, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

interface Interview {
  id: string;
  candidate_name: string;
  role: string;
  status: string;
  invite_link: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-500/20 text-yellow-400",
  active:    "bg-blue-500/20 text-blue-400",
  completed: "bg-purple-500/20 text-purple-400",
  evaluated: "bg-green-500/20 text-green-400",
};

export default function Dashboard() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newInviteLink, setNewInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
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
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">AI Interviewer — Dashboard</h1>

      {/* Create interview form */}
      <div className="bg-gray-900 rounded-xl p-6 mb-10 border border-gray-800">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} /> New Interview
        </h2>
        <form onSubmit={createInterview} className="grid grid-cols-2 gap-4">
          <input
            required
            placeholder="Candidate name"
            className="col-span-1 bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.candidate_name}
            onChange={(e) => setForm({ ...form, candidate_name: e.target.value })}
          />
          <input
            required
            type="email"
            placeholder="Candidate email"
            className="col-span-1 bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.candidate_email}
            onChange={(e) => setForm({ ...form, candidate_email: e.target.value })}
          />
          <input
            required
            placeholder="Role (e.g. Senior Backend Engineer)"
            className="col-span-2 bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <textarea
            required
            rows={5}
            placeholder="Paste the job description here..."
            className="col-span-2 bg-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={form.job_description}
            onChange={(e) => setForm({ ...form, job_description: e.target.value })}
          />
          <button
            type="submit"
            disabled={creating}
            className="col-span-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 font-medium flex items-center justify-center gap-2"
          >
            {creating ? <><Loader2 size={16} className="animate-spin" /> Generating invite...</> : "Create Interview"}
          </button>
        </form>

        {newInviteLink && (
          <div className="mt-4 flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
            <span className="text-sm text-green-400 flex-1 truncate">{newInviteLink}</span>
            <button onClick={() => copy(newInviteLink)} className="text-green-400 hover:text-green-300">
              <ClipboardCopy size={16} />
            </button>
            {copied && <span className="text-xs text-green-400">Copied!</span>}
          </div>
        )}
      </div>

      {/* Interviews list */}
      <h2 className="text-xl font-semibold mb-4">All Interviews</h2>
      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading...</div>
      ) : interviews.length === 0 ? (
        <div className="text-gray-500 text-center py-12">No interviews yet.</div>
      ) : (
        <div className="space-y-3">
          {interviews.map((i) => (
            <div key={i.id} className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{i.candidate_name}</p>
                <p className="text-sm text-gray-400">{i.role}</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(i.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[i.status] ?? "bg-gray-700 text-gray-300"}`}>
                  {i.status}
                </span>
                {i.status === "evaluated" && (
                  <Link href={`/report/${i.id}`} className="text-sm text-blue-400 hover:underline">
                    View Report
                  </Link>
                )}
                <button onClick={() => copy(i.invite_link)} className="text-gray-500 hover:text-gray-300">
                  <ClipboardCopy size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
