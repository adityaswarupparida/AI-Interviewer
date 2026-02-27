"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { InterviewRoom } from "@/components/InterviewRoom";
import { Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface TokenResponse {
  token: string;
  livekit_url: string;
  room_name: string;
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]                 = useState<TokenResponse | null>(null);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetch(`${API}/api/interviews/${id}/token`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail ?? "Failed to join interview.");
        }
        return res.json();
      })
      .then((d) => { setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
      <div className="flex flex-col items-center justify-center h-screen gap-3 px-8 text-center">
        <p className="font-display text-2xl font-light text-[#e8e4dc]">Unable to join</p>
        <p className="text-sm text-[#4b5563]">{error}</p>
        <p className="text-[11px] text-[#2e3540] tracking-wide mt-1">
          This link may have already been used or has expired.
        </p>
      </div>
    );
  }

  return (
    <InterviewRoom
      token={data!.token}
      serverUrl={data!.livekit_url}
      candidateName={candidateName}
      interviewId={id}
    />
  );
}
