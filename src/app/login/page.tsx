"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_parameters: "Missing required parameters",
        invalid_state: "Invalid state parameter - possible CSRF attack",
        missing_verifier: "Missing code verifier",
        authentication_failed: "Authentication failed. Please try again.",
      };
      setErrorMessage(errorMessages[error] || "An error occurred during login");
    }
  }, [error]);

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 text-center">
        <div>
          <h1 className="text-5xl font-semibold sm:text-6xl">Cloudmate</h1>
          <p className="mt-4 text-lg text-zinc-300 sm:text-xl">
            Connect with your SoundCloud account to explore profiles, playlists, and more
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-400">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="flex items-center justify-center gap-3 rounded-lg bg-[#ff5500] px-8 py-4 text-lg font-medium text-white transition hover:bg-[#ff6a1a] focus:outline-none focus:ring-4 focus:ring-[#ff5500]/50"
        >
          <svg
            className="h-6 w-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M1.175 12.395c-.051 0-.076.025-.076.076v1.536c0 .051.025.076.076.076.05 0 .076-.025.076-.076v-1.536c0-.051-.025-.076-.076-.076zm-.405.025c-.05 0-.076.025-.076.076v1.485c0 .051.025.076.076.076.051 0 .076-.025.076-.076V12.52c0-.051-.025-.076-.076-.076zm.81-.177c-.051 0-.076.025-.076.076v1.689c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-1.69c0-.05-.025-.075-.076-.075zm.405-.05c-.05 0-.076.025-.076.076v1.79c0 .05.025.075.076.075s.076-.025.076-.076v-1.789c0-.051-.025-.076-.076-.076zm.405-.253c-.051 0-.076.025-.076.076v2.295c0 .051.025.076.076.076.051 0 .076-.025.076-.076V12.04c0-.051-.025-.076-.076-.076zm.405-.076c-.051 0-.076.025-.076.076v2.447c0 .051.025.076.076.076.05 0 .076-.025.076-.076V12.04c0-.051-.026-.076-.076-.076zm.405-.228c-.051 0-.076.025-.076.076v2.751c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-2.751c0-.051-.025-.076-.076-.076zm.405-.304c-.051 0-.076.025-.076.076v3.36c0 .05.025.075.076.075s.076-.025.076-.076v-3.359c0-.051-.025-.076-.076-.076zm.405.076c-.05 0-.076.025-.076.076v3.282c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-3.282c0-.051-.025-.076-.076-.076zm.405-.406c-.051 0-.076.025-.076.076v4.065c0 .05.025.076.076.076.051 0 .076-.025.076-.076v-4.065c0-.051-.025-.076-.076-.076zm.405.177c-.051 0-.076.025-.076.076v3.762c0 .051.025.076.076.076.05 0 .076-.025.076-.076v-3.762c0-.051-.026-.076-.076-.076zm.405-.355c-.051 0-.076.025-.076.076v4.395c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-4.395c0-.051-.025-.076-.076-.076zm.405-.126c-.051 0-.076.025-.076.076v4.623c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-4.623c0-.051-.025-.076-.076-.076zm.405.025c-.05 0-.076.026-.076.077v4.598c0 .05.025.076.076.076.051 0 .076-.025.076-.076v-4.598c0-.051-.025-.076-.076-.076zm.405-.203c-.051 0-.076.025-.076.076v4.953c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-4.953c0-.051-.025-.076-.076-.076zm.405.051c-.051 0-.076.025-.076.076v4.8c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-4.8c0-.051-.025-.076-.076-.076zm.405-.203c-.051 0-.076.025-.076.076v5.232c0 .051.025.076.076.076.05 0 .076-.025.076-.076v-5.232c0-.051-.026-.076-.076-.076zm.405-.025c-.051 0-.076.025-.076.076v5.283c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-5.283c0-.051-.025-.076-.076-.076zm.405-.051c-.05 0-.076.026-.076.077v5.41c0 .05.025.076.076.076.051 0 .076-.025.076-.076v-5.41c0-.051-.025-.076-.076-.076zm.405-.127c-.051 0-.076.026-.076.077v5.613c0 .05.025.076.076.076.051 0 .076-.025.076-.076v-5.613c0-.051-.025-.076-.076-.076zm.405.051c-.051 0-.076.025-.076.076v5.56c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-5.56c0-.051-.025-.076-.076-.076zm.405-.127c-.051 0-.076.026-.076.077v5.74c0 .05.025.075.076.075.051 0 .076-.025.076-.076v-5.74c0-.05-.025-.076-.076-.076zm.405-.076c-.051 0-.076.025-.076.076v5.893c0 .051.025.076.076.076.05 0 .076-.025.076-.076v-5.893c0-.051-.026-.076-.076-.076zm.405-.177c-.051 0-.076.025-.076.076v6.246c0 .051.025.076.076.076.051 0 .076-.025.076-.076v-6.246c0-.051-.025-.076-.076-.076z" />
          </svg>
          Sign in with SoundCloud
        </button>

        <p className="text-sm text-zinc-400">
          By signing in, you agree to grant Cloudmate access to your SoundCloud profile data.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}

