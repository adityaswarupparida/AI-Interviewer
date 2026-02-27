"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { InterviewRoom } from "@/components/InterviewRoom";
import { Loader2, Mic, MicOff } from "lucide-react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface TokenResponse {
  token: string;
  livekit_url: string;
  room_name: string;
  candidate_name: string;
  role: string;
}

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]     = useState<TokenResponse | null>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/interviews/${id}/token`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail ?? "Failed to join interview.");
        }
        return res.json();
      })
      .then((d) => setData(d))
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

  if (!joined) {
    return (
      <LobbyScreen
        data={data!}
        micEnabled={micEnabled}
        onMicToggle={() => setMicEnabled((v) => !v)}
        onJoin={() => setJoined(true)}
      />
    );
  }

  return (
    <InterviewRoom
      token={data!.token}
      serverUrl={data!.livekit_url}
      candidateName={data!.candidate_name}
      interviewId={id}
      initialMicEnabled={micEnabled}
    />
  );
}

function LobbyScreen({
  data,
  micEnabled,
  onMicToggle,
  onJoin,
}: {
  data: TokenResponse;
  micEnabled: boolean;
  onMicToggle: () => void;
  onJoin: () => void;
}) {
  const [permission, setPermission] = useState<"pending" | "granted" | "denied">("pending");
  const streamRef = useRef<MediaStream | null>(null);

  // Request mic permission now so the browser prompt appears in the lobby,
  // not mid-interview. The stream is stopped before LiveKit takes over —
  // the browser caches the granted permission so LiveKit won't prompt again.
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        setPermission("granted");
      })
      .catch(() => {
        setPermission("denied");
      });
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleJoin = () => {
    // Release the lobby stream first, then give the browser a moment to free
    // the hardware before LiveKit acquires its own stream — avoids a race
    // condition that can stall the LiveKit connection on some platforms.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTimeout(onJoin, 200);
  };
  return (
    <div style={{
      minHeight: "100vh",
      background: "#07080d",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px",
      fontFamily: "'IBM Plex Mono', monospace",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(78,203,160,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "440px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "32px",
        zIndex: 1,
      }}>

        {/* Role */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#4ecba0", marginBottom: "14px" }}>
            Interview
          </p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "36px",
            fontWeight: 300,
            color: "#e8e4dc",
            letterSpacing: "0.02em",
            lineHeight: 1.2,
            margin: 0,
          }}>
            {data.role}
          </h1>
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "10px" }}>
            {data.candidate_name}
          </p>
        </div>

        {/* Instructions card */}
        <div style={{
          width: "100%",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "16px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <p style={{ fontSize: "11px", color: "#9ca3af", lineHeight: 1.7, margin: 0 }}>
            The AI interviewer will ask you questions about your experience and skills.
            Speak naturally — it listens and responds in real time.
          </p>

          {/* Mic permission + toggle */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "8px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}>
            {permission === "pending" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Loader2 size={13} style={{ color: "#6b7280", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "11px", color: "#6b7280" }}>Requesting microphone…</span>
              </div>
            )}
            {permission === "denied" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MicOff size={13} style={{ color: "#ef4444" }} />
                <span style={{ fontSize: "11px", color: "#6b7280" }}>
                  Microphone blocked — enable it in browser settings
                </span>
              </div>
            )}
            {permission === "granted" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {micEnabled
                    ? <Mic size={13} style={{ color: "#4ecba0" }} />
                    : <MicOff size={13} style={{ color: "#ef4444" }} />
                  }
                  <span style={{ fontSize: "11px", color: micEnabled ? "#9ca3af" : "#6b7280" }}>
                    {micEnabled ? "Microphone on" : "Microphone off"}
                  </span>
                </div>
                <button
                  onClick={onMicToggle}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "100px",
                    border: `1px solid ${micEnabled ? "rgba(78,203,160,0.25)" : "rgba(239,68,68,0.25)"}`,
                    background: micEnabled ? "rgba(78,203,160,0.06)" : "rgba(239,68,68,0.06)",
                    color: micEnabled ? "#4ecba0" : "#ef4444",
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    cursor: "pointer",
                  }}
                >
                  {micEnabled ? "Turn off" : "Turn on"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Join button */}
        <button
          onClick={handleJoin}
          disabled={permission === "pending"}
          style={{
            padding: "14px 48px",
            borderRadius: "100px",
            border: "1px solid rgba(78,203,160,0.35)",
            background: "rgba(78,203,160,0.07)",
            color: "#4ecba0",
            fontSize: "12px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: permission === "pending" ? "default" : "pointer",
            opacity: permission === "pending" ? 0.4 : 1,
            transition: "opacity 0.15s ease",
          }}
          onMouseOver={(e) => { if (permission !== "pending") e.currentTarget.style.opacity = "0.75"; }}
          onMouseOut={(e) => { if (permission !== "pending") e.currentTarget.style.opacity = "1"; }}
        >
          Start Interview
        </button>

      </div>
    </div>
  );
}
