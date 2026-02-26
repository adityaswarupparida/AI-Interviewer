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
}

export function InterviewRoom({ token, serverUrl, candidateName, interviewId }: InterviewRoomProps) {
  const router = useRouter();

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      className="h-screen"
      onDisconnected={() => router.push(`/report/${interviewId}`)}
    >
      <RoomAudioRenderer />
      <InterviewUI candidateName={candidateName} interviewId={interviewId} />
    </LiveKitRoom>
  );
}

function InterviewUI({ candidateName, interviewId }: { candidateName: string; interviewId: string }) {
  const { state, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();
  const [muted, setMuted] = useState(false);
  const userStoppedAt = useRef<number>(0);
  const prevState = useRef<string>("");
  const turnIndex = useRef<number>(0);

  // Use raw LiveKit event — isSpeakingChanged is reliable unlike hook-based isSpeaking.
  // Only record user stop time when agent is NOT speaking — avoids echo contamination.
  useEffect(() => {
    const lp = room.localParticipant;
    if (!lp) return;
    const onSpeakingChanged = (speaking: boolean) => {
      if (prevState.current === "speaking") return; // ignore echo during agent speech
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

  // Track when agent starts speaking — measure latency from user stop.
  // Clear userStoppedAt whenever agent starts speaking to avoid stale reads.
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
        }).catch(() => {}); // fire-and-forget, don't block UI
        turnIndex.current += 1;
      }
      userStoppedAt.current = 0;
    }
    prevState.current = state;
  }, [state, interviewId]);

  const stateLabel: Record<string, string> = {
    disconnected: "Connecting...",
    connecting:   "Connecting...",
    initializing: "Starting interview...",
    listening:    "Listening...",
    thinking:     "Thinking...",
    speaking:     "Interviewer speaking",
  };

  const isAgentSpeaking = state === "speaking";

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-8">
      {/* Interviewer avatar */}
      <div className="relative">
        <div
          className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-300 ${
            isAgentSpeaking
              ? "bg-blue-600 shadow-[0_0_40px_10px_rgba(59,130,246,0.4)]"
              : "bg-gray-800"
          }`}
        >
          <svg viewBox="0 0 64 64" className="w-16 h-16 text-white opacity-80" fill="currentColor">
            <circle cx="32" cy="20" r="10" />
            <rect x="18" y="34" width="28" height="20" rx="6" />
            <rect x="10" y="36" width="8" height="14" rx="4" />
            <rect x="46" y="36" width="8" height="14" rx="4" />
          </svg>
        </div>
        {isAgentSpeaking && (
          <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-30" />
        )}
      </div>

      {/* State label */}
      <p className="text-gray-400 text-lg tracking-wide">
        {stateLabel[state] ?? state}
      </p>

      {/* Audio visualizer when agent is speaking */}
      {audioTrack && isAgentSpeaking && (
        <div className="w-64 h-12">
          <BarVisualizer trackRef={audioTrack} barCount={24} className="h-full" />
        </div>
      )}

      {/* Candidate info */}
      <p className="text-sm text-gray-600">You are: {candidateName}</p>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMuted((m) => !m)}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-colors ${
            muted ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
          {muted ? "Unmute" : "Mute"}
        </button>

        <button
          onClick={() => room.disconnect()}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-medium bg-red-700 hover:bg-red-800 transition-colors"
        >
          <PhoneOff size={18} />
          End Interview
        </button>
      </div>

      <p className="text-xs text-gray-700 max-w-sm text-center">
        Speak clearly into your microphone. The interviewer will ask one question at a time.
      </p>
    </div>
  );
}
