"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
} from "@livekit/components-react";
import { Mic, MicOff } from "lucide-react";
import { useState } from "react";

interface InterviewRoomProps {
  token: string;
  serverUrl: string;
  candidateName: string;
}

export function InterviewRoom({ token, serverUrl, candidateName }: InterviewRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      className="h-screen"
    >
      <RoomAudioRenderer />
      <InterviewUI candidateName={candidateName} />
    </LiveKitRoom>
  );
}

function InterviewUI({ candidateName }: { candidateName: string }) {
  const { state, audioTrack } = useVoiceAssistant();
  const [muted, setMuted] = useState(false);

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
          className={`w-36 h-36 rounded-full flex items-center justify-center text-4xl transition-all duration-300 ${
            isAgentSpeaking
              ? "bg-blue-600 shadow-[0_0_40px_10px_rgba(59,130,246,0.4)]"
              : "bg-gray-800"
          }`}
        >
          🤖
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

      {/* Mute toggle */}
      <button
        onClick={() => setMuted((m) => !m)}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-colors ${
          muted ? "bg-red-600 hover:bg-red-700" : "bg-gray-800 hover:bg-gray-700"
        }`}
      >
        {muted ? <MicOff size={18} /> : <Mic size={18} />}
        {muted ? "Unmute" : "Mute"}
      </button>

      <p className="text-xs text-gray-700 max-w-sm text-center">
        Speak clearly into your microphone. The interviewer will ask one question at a time.
      </p>
    </div>
  );
}
