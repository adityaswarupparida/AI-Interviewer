"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { setToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Registration failed.");
      }
      const data = await res.json();
      setToken(data.access_token);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-light text-[#e8e4dc] tracking-wide">
            AI Interviewer
          </h1>
          <p className="text-[10px] text-[#6b7280] tracking-[0.18em] uppercase mt-2">
            Create your account
          </p>
        </div>

        <div className="bg-ink border border-white/[0.06] rounded-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="Full name"
              className="w-full bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-[#e8e4dc] placeholder:text-[#3d4a5c] focus:outline-none focus:border-white/20 transition-colors"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="w-full bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-[#e8e4dc] placeholder:text-[#3d4a5c] focus:outline-none focus:border-white/20 transition-colors"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Password (min 8 characters)"
                className="w-full bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-10 text-sm text-[#e8e4dc] placeholder:text-[#3d4a5c] focus:outline-none focus:border-white/20 transition-colors"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d4a5c] hover:text-[#6b7280] transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {error && (
              <p className="text-[11px] text-red-400 px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.09] disabled:opacity-40 rounded-xl py-3 text-sm text-[#e8e4dc] tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer mt-1"
            >
              {loading ? <><Loader2 size={13} className="animate-spin" /> Creating account...</> : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#6b7280] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#9ca3af] hover:text-[#e8e4dc] transition-colors">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}
