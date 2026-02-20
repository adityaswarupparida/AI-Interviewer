"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
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

const ELIGIBILITY_STYLES: Record<string, string> = {
  "Strong Hire":    "bg-green-500/20 text-green-400 border-green-500/40",
  "Hire":           "bg-blue-500/20 text-blue-400 border-blue-500/40",
  "No Hire":        "bg-red-500/20 text-red-400 border-red-500/40",
  "Strong No Hire": "bg-red-700/20 text-red-500 border-red-700/40",
};

export function ReportCard({ report }: { report: Report }) {
  const competencyData = Object.entries(report.competency_scores).map(([key, val]) => ({
    subject: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    score: val.score,
  }));

  const eligibilityStyle = ELIGIBILITY_STYLES[report.role_eligibility] ?? "bg-gray-700 text-gray-300 border-gray-600";

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold">{report.candidate_name}</h1>
          <p className="text-gray-400 mt-1">{report.role_applied}</p>
          <p className="text-xs text-gray-600 mt-2">
            Report generated {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className={`border rounded-xl px-6 py-3 text-lg font-bold ${eligibilityStyle}`}>
            {report.role_eligibility}
          </div>
          <div className="text-5xl font-bold mt-3 tabular-nums">
            {report.overall_score}
            <span className="text-2xl text-gray-500">/10</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-gray-300 mb-2">Hiring Recommendation</h2>
        <p className="text-gray-200 leading-relaxed">{report.recommendation}</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Competency Scores</h2>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={competencyData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Skill Scores</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.skill_scores} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" domain={[0, 10]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis type="category" dataKey="skill" width={100} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip
                content={({ payload }) =>
                  payload?.[0] ? (
                    <div className="bg-gray-800 border border-gray-700 rounded p-3 max-w-xs text-xs text-gray-300">
                      <p className="font-semibold mb-1">{payload[0].payload.skill}: {payload[0].value}/10</p>
                      <p>{payload[0].payload.evidence}</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competency notes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-4">Competency Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(report.competency_scores).map(([key, val]) => (
            <div key={key} className="border border-gray-800 rounded-lg p-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</span>
                <span className="text-blue-400 font-bold">{val.score}/10</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full mb-2">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${val.score * 10}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{val.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-green-400">
            <CheckCircle size={16} /> Strengths
          </h2>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-green-500 mt-0.5">•</span> {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-red-400">
            <XCircle size={16} /> Weaknesses
          </h2>
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-red-500 mt-0.5">•</span> {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Green / Red flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {report.green_flags?.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
            <h2 className="font-semibold mb-3 text-green-400">Green Flags</h2>
            <ul className="space-y-1">
              {report.green_flags.map((f, i) => <li key={i} className="text-sm text-gray-300">✓ {f}</li>)}
            </ul>
          </div>
        )}
        {report.red_flags?.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
            <h2 className="font-semibold mb-3 text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} /> Red Flags
            </h2>
            <ul className="space-y-1">
              {report.red_flags.map((f, i) => <li key={i} className="text-sm text-gray-300">⚠ {f}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Areas for improvement */}
      <div>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={18} /> Areas for Improvement
        </h2>
        <div className="space-y-4">
          {report.areas_for_improvement.map((area, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{area.area}</h3>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                  {area.current_level}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{area.why_important}</p>
              <div className="text-xs text-gray-500 mb-2">
                <span className="font-medium text-gray-400">Timeline: </span>{area.timeline}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-400">Resources: </span>
                {area.resources.join(" · ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interview quality notes */}
      {report.interview_quality_notes && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-2 text-gray-300">Interviewer Notes</h2>
          <p className="text-sm text-gray-400 italic">{report.interview_quality_notes}</p>
        </div>
      )}
    </div>
  );
}
