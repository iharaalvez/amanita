"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { XIcon } from "@/components/ui";

type Props = {
  onClose: () => void;
};

type Mode = "signin" | "signup";

export function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setError(null);
    setSuccess(null);
    setOauthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        setSuccess("Check your email to confirm your account, then sign in.");
        setMode("signin");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition-colors ${
                mode === m
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={oauthLoading || loading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-gray-900">
            G
          </span>
          {oauthLoading ? "Opening Google..." : "Continue with Google"}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            or
          </span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder={mode === "signup" ? "At least 6 characters" : ""}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
