"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  useRoomContext,
} from "@livekit/components-react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface InterviewRoomProps {
  token: string;
  serverUrl: string;
  candidateName: string;
  interviewId: string;
  initialMicEnabled?: boolean;
}

const STATE_CONFIG: Record<string, { label: string; color: string; glow: string; ring: string }> = {
  disconnected: { label: "Connecting",         color: "#3d4a5c", glow: "rgba(61,74,92,0.12)",    ring: "rgba(61,74,92,0.25)"    },
  connecting:   { label: "Connecting",         color: "#3d4a5c", glow: "rgba(61,74,92,0.12)",    ring: "rgba(61,74,92,0.25)"    },
  initializing: { label: "Starting",           color: "#8b78e6", glow: "rgba(139,120,230,0.18)", ring: "rgba(139,120,230,0.32)" },
  listening:    { label: "Listening",          color: "#4ecba0", glow: "rgba(78,203,160,0.15)",  ring: "rgba(78,203,160,0.28)"  },
  thinking:     { label: "Thinking",           color: "#e8a84c", glow: "rgba(232,168,76,0.15)",  ring: "rgba(232,168,76,0.28)"  },
  speaking:     { label: "Speaking",           color: "#5bb8e8", glow: "rgba(91,184,232,0.18)",  ring: "rgba(91,184,232,0.32)"  },
};

export function InterviewRoom({ token, serverUrl, candidateName, interviewId, initialMicEnabled = true }: InterviewRoomProps) {
  const router = useRouter();

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={initialMicEnabled}
      video={false}
      className="h-screen"
      onDisconnected={() => router.push(`/report/${interviewId}`)}
    >
      <RoomAudioRenderer />
      <InterviewUI candidateName={candidateName} interviewId={interviewId} initialMicEnabled={initialMicEnabled} />
    </LiveKitRoom>
  );
}

function InterviewUI({ candidateName, interviewId, initialMicEnabled = true }: { candidateName: string; interviewId: string; initialMicEnabled?: boolean }) {
  const { state, audioTrack, agent } = useVoiceAssistant();
  const room = useRoomContext();
  const [muted, setMuted] = useState(!initialMicEnabled);
  const userStoppedAt = useRef<number>(0);
  const prevState = useRef<string>("");
  const turnIndex = useRef<number>(0);

  // Debounced display state — switches TO speaking instantly (catches state-attribute lag
  // on the initial generate_reply), but holds for 600ms before switching AWAY to prevent
  // flickering caused by brief audio pauses mid-speech.
  const [displayState, setDisplayState] = useState(state);
  const speakingHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isSpeaking = agent?.isSpeaking || state === "speaking";
    if (isSpeaking) {
      if (speakingHoldTimer.current) { clearTimeout(speakingHoldTimer.current); speakingHoldTimer.current = null; }
      setDisplayState("speaking");
    } else if (displayState === "speaking") {
      speakingHoldTimer.current = setTimeout(() => setDisplayState(state), 300);
    } else {
      setDisplayState(state);
    }
    return () => { if (speakingHoldTimer.current) clearTimeout(speakingHoldTimer.current); };
  }, [state, agent?.isSpeaking]);

  useEffect(() => {
    const lp = room.localParticipant;
    if (!lp) return;
    const onSpeakingChanged = (speaking: boolean) => {
      if (prevState.current === "speaking") return;
      if (!speaking) {
        userStoppedAt.current = Date.now();
        console.log("[VAD] User stopped speaking");
      } else {
        console.log("[VAD] User started speaking");
      }
    };
    lp.on("isSpeakingChanged", onSpeakingChanged);
    return () => { lp.off("isSpeakingChanged", onSpeakingChanged); };
  }, [room]);

  useEffect(() => {
    if (prevState.current !== "speaking" && state === "speaking") {
      if (userStoppedAt.current) {
        const ms = Date.now() - userStoppedAt.current;
        console.log(`[LATENCY] ${ms}ms from user stopped → agent audio started`);
        fetch(`${API}/api/metrics/latency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interview_id: interviewId,
            latency_ms: ms,
            turn_index: turnIndex.current,
          }),
        }).catch(() => {});
        turnIndex.current += 1;
      }
      userStoppedAt.current = 0;
    }
    prevState.current = state;
  }, [state, interviewId]);

  const cfg = STATE_CONFIG[displayState] ?? STATE_CONFIG.connecting;
  const isListening = displayState === "listening";
  const isThinking = displayState === "thinking";
  const isSpeaking = displayState === "speaking";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=IBM+Plex+Mono:wght@300;400&display=swap');

        @keyframes breathe {
          0%, 100% { transform: scale(1);    opacity: 0.5; }
          50%       { transform: scale(1.1); opacity: 1;   }
        }
        @keyframes sonar-1 {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0;   }
        }
        @keyframes sonar-2 {
          0%   { transform: scale(1);    opacity: 0.4; }
          100% { transform: scale(1.9);  opacity: 0;   }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes ambient-shift {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1;   }
        }
        .orb-glow { transition: box-shadow 0.8s ease, border-color 0.8s ease, background 0.8s ease; }
        .state-label { animation: fade-up 0.4s ease both; }
        .ctrl-btn { transition: opacity 0.15s ease; }
        .ctrl-btn:hover { opacity: 0.75; }
        .ctrl-btn:active { opacity: 0.55; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#07080d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Ambient radial wash — shifts with state */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 55% at 50% 42%, ${cfg.glow} 0%, transparent 70%)`,
          transition: "background 1.2s ease",
          pointerEvents: "none",
        }} />

        {/* Candidate name — top */}
        <div style={{ position: "absolute", top: "36px", textAlign: "center" }}>
          <p style={{
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#2e3540",
          }}>
            {candidateName}
          </p>
        </div>

        {/* Centre stage */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "52px", zIndex: 1 }}>

          {/* Orb container */}
          <div style={{ position: "relative", width: "220px", height: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>

            {/* Sonar rings — listening */}
            {isListening && (
              <>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: `1px solid ${cfg.ring}`,
                  animation: "sonar-1 2.4s ease-out infinite",
                }} />
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: `1px solid ${cfg.ring}`,
                  animation: "sonar-2 2.4s ease-out infinite 0.8s",
                }} />
              </>
            )}

            {/* Orbiting arc — thinking */}
            {isThinking && (
              <div style={{
                position: "absolute",
                inset: "-18px",
                borderRadius: "50%",
                border: `1.5px solid transparent`,
                borderTopColor: cfg.color,
                borderRightColor: cfg.ring,
                animation: "orbit 1.4s cubic-bezier(0.4,0,0.2,1) infinite",
              }} />
            )}

            {/* Speaking outer glow ring */}
            {isSpeaking && (
              <div style={{
                position: "absolute",
                inset: "-10px",
                borderRadius: "50%",
                border: `1px solid ${cfg.ring}`,
                animation: "breathe 2.2s ease-in-out infinite",
              }} />
            )}

            {/* Main orb */}
            <div
              className="orb-glow"
              style={{
                width: "220px",
                height: "220px",
                borderRadius: "50%",
                background: `radial-gradient(circle at 38% 32%, ${cfg.color}1a 0%, #0d1018 65%)`,
                border: `1px solid ${cfg.color}30`,
                boxShadow: `0 0 80px 0 ${cfg.glow}, 0 0 24px 0 ${cfg.glow}, inset 0 1px 0 ${cfg.color}15`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                overflow: "hidden",
                animation: isListening ? "breathe 3.5s ease-in-out infinite" : undefined,
              }}
            >
              {/* Core dot */}
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${cfg.color}55 0%, transparent 70%)`,
                transition: "background 0.8s ease",
              }} />

              {/* BarVisualizer — only when speaking */}
              {audioTrack && isSpeaking && (
                <div style={{ width: "120px", height: "28px", opacity: 0.65 }}>
                  <BarVisualizer trackRef={audioTrack} barCount={18} className="h-full" />
                </div>
              )}
            </div>
          </div>

          {/* State label */}
          <div style={{ textAlign: "center" }}>
            <p
              key={displayState}
              className="state-label"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "32px",
                fontWeight: 300,
                letterSpacing: "0.04em",
                color: cfg.color,
                marginBottom: "10px",
                transition: "color 0.8s ease",
              }}
            >
              {cfg.label}
            </p>
            <p style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#252d38",
            }}>
              AI Interviewer
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          position: "absolute",
          bottom: "52px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              room.localParticipant.setMicrophoneEnabled(!next);
            }}
            className="ctrl-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "13px 26px",
              borderRadius: "100px",
              border: `1px solid ${muted ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
              background: muted ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)",
              color: muted ? "#ef4444" : "#4b5a6b",
              fontSize: "11px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              backdropFilter: "blur(12px)",
            }}
          >
            {muted ? <MicOff size={14} /> : <Mic size={14} />}
            {muted ? "Unmute" : "Mute"}
          </button>

          <button
            onClick={() => room.disconnect()}
            className="ctrl-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "13px 26px",
              borderRadius: "100px",
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.06)",
              color: "#ef4444",
              fontSize: "11px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              backdropFilter: "blur(12px)",
            }}
          >
            <PhoneOff size={14} />
            End Interview
          </button>
        </div>

      </div>
    </>
  );
}
