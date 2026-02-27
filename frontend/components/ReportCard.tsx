"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle, XCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface Report {
  id: string;
  candidate_name: string;
  role_applied: string;
  overall_score: number;
  role_eligibility: string;
  recommendation: string;
  skill_scores: { skill: string; score: number; evidence: string }[];
  competency_scores: Record<string, { score: number; notes: string }>;
  strengths: string[];
  weaknesses: string[];
  areas_for_improvement: {
    area: string;
    current_level: string;
    why_important: string;
    resources: string[];
    timeline: string;
  }[];
  red_flags: string[];
  green_flags: string[];
  interview_quality_notes: string;
  generated_at: string;
}

const ELIGIBILITY_CONFIG: Record<string, { textClass: string; dotClass: string }> = {
  "Strong Hire":    { textClass: "text-[#4ecba0]", dotClass: "bg-[#4ecba0]" },
  "Hire":           { textClass: "text-sky-400",   dotClass: "bg-sky-400"   },
  "No Hire":        { textClass: "text-amber-400", dotClass: "bg-amber-400" },
  "Strong No Hire": { textClass: "text-red-400",   dotClass: "bg-red-400"   },
};

export function ReportCard({ report }: { report: Report }) {
  const competencyData = Object.entries(report.competency_scores).map(([key, val]) => ({
    subject: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: val.score,
  }));

  const eligibility = ELIGIBILITY_CONFIG[report.role_eligibility] ?? {
    textClass: "text-[#9ca3af]",
    dotClass: "bg-[#4b5563]",
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-6">

      {/* Header */}
      <div className="bg-ink border border-white/[0.06] rounded-2xl p-8">
        <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-6">
          Interview Report
        </p>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl font-light text-[#e8e4dc] leading-tight">
              {report.candidate_name}
            </h1>
            <p className="text-sm text-[#9ca3af] mt-1.5">{report.role_applied}</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${eligibility.dotClass}`} />
                <span className={`text-xs ${eligibility.textClass}`}>{report.role_eligibility}</span>
              </div>
              <span className="text-[#6b7280]">·</span>
              <span className="text-[10px] text-[#6b7280] tracking-wide">
                {new Date(report.generated_at).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0 flex items-baseline gap-1">
            <span className="font-display text-6xl font-light text-[#e8e4dc] leading-none tabular-nums">
              {report.overall_score}
            </span>
            <span className="font-display text-2xl font-light text-[#6b7280]">/10</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-ink border border-white/[0.06] rounded-2xl p-6">
        <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-3">
          Hiring Recommendation
        </p>
        <p className="text-sm text-[#9ca3af] leading-relaxed">{report.recommendation}</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-ink border border-white/[0.06] rounded-2xl p-6">
          <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-5">
            Competency Overview
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={competencyData}>
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#4ecba0"
                fill="#4ecba0"
                fillOpacity={0.20}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-ink border border-white/[0.06] rounded-2xl p-6">
          <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-5">
            Skill Scores
          </p>
          <ResponsiveContainer width="100%" height={Math.max(240, report.skill_scores.length * 36)}>
            <BarChart
              data={report.skill_scores}
              layout="vertical"
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <XAxis
                type="number"
                domain={[0, 10]}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickCount={6}
              />
              <YAxis
                type="category"
                dataKey="skill"
                width={100}
                tick={({ x, y, payload }: any) => {
                  const words = payload.value.split(" ");
                  const lines: string[] = [];
                  let current = "";
                  for (const word of words) {
                    const test = current ? `${current} ${word}` : word;
                    if (test.length > 14 && current) { lines.push(current); current = word; }
                    else { current = test; }
                  }
                  if (current) lines.push(current);
                  const displayLines = lines.slice(0, 2);
                  if (lines.length > 2) displayLines[1] = displayLines[1].slice(0, 12) + "…";
                  const lh = 11;
                  const offsetY = displayLines.length === 2 ? -lh / 2 : 0;
                  return (
                    <text x={x} y={y + offsetY} textAnchor="end" fill="#6b7280" fontSize={10}>
                      {displayLines.map((line, i) => (
                        <tspan key={i} x={x} dy={i === 0 ? 4 : lh}>{line}</tspan>
                      ))}
                    </text>
                  );
                }}
              />
              <Tooltip
                content={({ payload }) =>
                  payload?.[0] ? (
                    <div className="bg-ink border border-white/[0.1] rounded-xl p-3 max-w-xs text-xs text-[#9ca3af] shadow-xl">
                      <p className="text-[#e8e4dc] mb-1">{payload[0].payload.skill}: {payload[0].value}/10</p>
                      <p>{payload[0].payload.evidence}</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="score" fill="#4ecba0" fillOpacity={0.7} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competency breakdown */}
      <div className="bg-ink border border-white/[0.06] rounded-2xl p-6">
        <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-5">
          Competency Breakdown
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(report.competency_scores).map(([key, val]) => (
            <div key={key} className="border border-white/[0.05] rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#e8e4dc] capitalize">{key.replace(/_/g, " ")}</span>
                <span className="text-xs text-[#4ecba0]">{val.score}/10</span>
              </div>
              <div className="h-0.5 bg-white/[0.05] rounded-full mb-3">
                <div
                  className="h-full bg-[#4ecba0]/50 rounded-full transition-all"
                  style={{ width: `${val.score * 10}%` }}
                />
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed">{val.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-ink border border-white/[0.06] rounded-2xl p-6">
          <p className="text-[10px] text-[#4ecba0] tracking-[0.18em] uppercase mb-4 flex items-center gap-2">
            <CheckCircle size={11} className="text-[#4ecba0]/70" /> Strengths
          </p>
          <ul className="space-y-3">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-[#4ecba0]/60 shrink-0 mt-0.5">—</span>
                <span className="text-sm text-[#9ca3af] leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-ink border border-white/[0.06] rounded-2xl p-6">
          <p className="text-[10px] text-red-400 tracking-[0.18em] uppercase mb-4 flex items-center gap-2">
            <XCircle size={11} className="text-red-400/70" /> Weaknesses
          </p>
          <ul className="space-y-3">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-red-500/60 shrink-0 mt-0.5">—</span>
                <span className="text-sm text-[#9ca3af] leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Green / Red flags */}
      {(report.green_flags?.length > 0 || report.red_flags?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.green_flags?.length > 0 && (
            <div className="bg-[#4ecba0]/[0.04] border border-[#4ecba0]/10 rounded-2xl p-6">
              <p className="text-[10px] text-[#4ecba0] tracking-[0.18em] uppercase mb-4">
                Green Flags
              </p>
              <ul className="space-y-2">
                {report.green_flags.map((f, i) => (
                  <li key={i} className="text-sm text-[#9ca3af] flex gap-2">
                    <span className="text-[#4ecba0]/70 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.red_flags?.length > 0 && (
            <div className="bg-red-500/[0.04] border border-red-500/10 rounded-2xl p-6">
              <p className="text-[10px] text-red-400 tracking-[0.18em] uppercase mb-4 flex items-center gap-2">
                <AlertTriangle size={11} /> Red Flags
              </p>
              <ul className="space-y-2">
                {report.red_flags.map((f, i) => (
                  <li key={i} className="text-sm text-[#9ca3af] flex gap-2">
                    <span className="text-red-400/70 shrink-0">⚠</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Areas for improvement */}
      <div>
        <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-4 flex items-center gap-2">
          <TrendingUp size={11} /> Areas for Improvement
        </p>
        <div className="space-y-3">
          {report.areas_for_improvement.map((area, i) => (
            <div key={i} className="bg-ink border border-white/[0.06] rounded-2xl p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm text-[#e8e4dc]">{area.area}</h3>
                <span className="text-[10px] text-[#6b7280] bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full tracking-wide shrink-0 ml-4">
                  {area.current_level}
                </span>
              </div>
              <p className="text-[11px] text-[#9ca3af] leading-relaxed mb-3">{area.why_important}</p>
              <div className="flex gap-1 text-[10px] text-[#6b7280]">
                <span className="text-[#9ca3af]">Timeline</span>
                <span>· {area.timeline}</span>
              </div>
              <p className="text-[10px] text-[#6b7280] mt-1">{area.resources.join(" · ")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interviewer notes */}
      {report.interview_quality_notes && (
        <div className="border-t border-white/[0.05] pt-8 pb-4">
          <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mb-3">
            Interviewer Notes
          </p>
          <p className="text-sm text-[#9ca3af] italic leading-relaxed">
            {report.interview_quality_notes}
          </p>
        </div>
      )}

    </div>
  );
}
