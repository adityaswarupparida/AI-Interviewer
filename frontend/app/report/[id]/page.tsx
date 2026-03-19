"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { ReportCard } from "@/components/ReportCard";
import { Loader2, RotateCcw, ClipboardCopy, ExternalLink } from "lucide-react";
import { authHeaders, clearToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [pending, setPending] = useState(false);
  const [repeating, setRepeating]   = useState(false);
  const [repeatLink, setRepeatLink] = useState("");
  const [copied, setCopied]         = useState(false);

  const handleRepeat = async () => {
    setRepeating(true);
    try {
      const res = await fetch(`${API}/api/interviews/${id}/repeat`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.status === 401) { clearToken(); router.push("/login"); return; }
      const data = await res.json();
      setRepeatLink(data.invite_link);
    } finally {
      setRepeating(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let stopped = false;

    const poll = async (): Promise<boolean> => {
      try {
        const res = await fetch(`${API}/api/reports/${id}`);
        if (res.status === 202) {
          setPending(true);
          return false;
        }
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail ?? "Failed to load report.");
        }
        const data = await res.json();
        setReport(data);
        setPending(false);
        return true;
      } catch (e: any) {
        setError(e.message);
        return true;
      } finally {
        setLoading(false);
      }
    };

    const run = async () => {
      while (!stopped) {
        const done = await poll();
        if (done) break;
        await new Promise((r) => setTimeout(r, 5000));
      }
    };

    run();
    return () => { stopped = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={18} className="animate-spin text-[#2e3540]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 text-center px-8">
        <p className="font-display text-2xl font-light text-[#e8e4dc]">Report unavailable</p>
        <p className="text-sm text-[#4b5563]">{error}</p>
      </div>
    );
  }

  if (pending || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 text-center px-8">
        <Loader2 size={18} className="animate-spin text-[#2e3540]" />
        <div>
          <p className="font-display text-2xl font-light text-[#e8e4dc]">Evaluation in progress</p>
          <p className="text-[11px] text-[#2e3540] tracking-wide mt-2">
            Usually takes 30–60 seconds · Page updates automatically
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReportCard report={report} />
      <div className="max-w-4xl mx-auto px-8 pb-12 space-y-3">
        {!repeatLink ? (
          <button
            onClick={handleRepeat}
            disabled={repeating}
            className="flex items-center gap-2 text-[11px] text-[#6b7280] hover:text-[#9ca3af] tracking-[0.12em] uppercase transition-colors disabled:opacity-40"
          >
            {repeating
              ? <Loader2 size={12} className="animate-spin" />
              : <RotateCcw size={12} />
            }
            Repeat Interview
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-[#4ecba0]/[0.05] border border-[#4ecba0]/20 rounded-xl px-4 py-3">
            <span className="text-[10px] text-[#4ecba0]/60 tracking-[0.15em] uppercase shrink-0">New link</span>
            <span className="text-xs text-[#4ecba0] flex-1 truncate tracking-wide">{repeatLink}</span>
            <button onClick={() => copy(repeatLink)} className="text-[#4ecba0]/50 hover:text-[#4ecba0] transition-colors" title="Copy">
              <ClipboardCopy size={13} />
            </button>
            <a href={repeatLink} target="_blank" rel="noopener noreferrer" className="text-[#4ecba0]/50 hover:text-[#4ecba0] transition-colors" title="Open">
              <ExternalLink size={13} />
            </a>
            {copied && <span className="text-[10px] text-[#4ecba0] tracking-[0.15em] uppercase">Copied</span>}
          </div>
        )}
      </div>
    </>
  );
}
