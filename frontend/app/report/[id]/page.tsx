"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReportCard } from "@/components/ReportCard";
import { Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/reports/${id}`);
        if (res.status === 202) {
          setPending(true);
          return; // still generating — keep polling
        }
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail ?? "Failed to load report.");
        }
        const data = await res.json();
        setReport(data);
        setPending(false);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    poll();
    // Poll every 5 seconds until report is ready
    const interval = setInterval(() => {
      if (!report) poll();
      else clearInterval(interval);
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (pending || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 size={32} className="animate-spin text-blue-400" />
        <p className="text-gray-400">Evaluation in progress...</p>
        <p className="text-sm text-gray-600">This usually takes 30-60 seconds. Page will update automatically.</p>
      </div>
    );
  }

  return <ReportCard report={report} />;
}
