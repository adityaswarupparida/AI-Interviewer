"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReportCard } from "@/components/ReportCard";
import { Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [pending, setPending] = useState(false);

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

  return <ReportCard report={report} />;
}
