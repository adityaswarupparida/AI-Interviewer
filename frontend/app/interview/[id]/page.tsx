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
  const [data, setData] = useState<TokenResponse | null>(null);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/interviews/${id}/token`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail ?? "Failed to join interview.");
        }
        return res.json();
      })
      .then((d) => {
        setData(d);
        // Try to pull candidate name from room metadata (optional)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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
        <p className="text-red-400 text-lg">{error}</p>
        <p className="text-gray-500 text-sm">This interview may have already been completed or the link is invalid.</p>
      </div>
    );
  }

  return (
    <InterviewRoom
      token={data!.token}
      serverUrl={data!.livekit_url}
      candidateName={candidateName}
    />
  );
}
