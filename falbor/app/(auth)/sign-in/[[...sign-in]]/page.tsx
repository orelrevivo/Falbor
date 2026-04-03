"use client"
import React, { useState } from "react"
import { useSignIn } from "@clerk/nextjs"
import type { OAuthStrategy } from "@clerk/types"
import Link from "next/link"
// import RotatingEarth from "@/components/ui/dotted-globe";
import FeatureShowcase from '@/components/auth/FeatureShowcase'
import FeatureShowcaseDark from "@/components/auth/FeatureShowcaseDark"

export default function Page() {
  const { signIn, isLoaded, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const GITHUB_CANDIDATES = ["oauth_github", "oauth_github_oauth_app"]
  const GOOGLE_CANDIDATES = ["oauth_google", "oauth_google_oauth_app"]

  async function tryStrategies(candidates: string[]): Promise<void> {
    if (!isLoaded || !signIn) throw new Error("SignIn not loaded")
    let lastError: any = null

    for (const s of candidates) {
      try {
        await signIn.authenticateWithRedirect({
          strategy: s as OAuthStrategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        })
        return
      } catch (err: any) {
        lastError = err
      }
    }
    throw lastError ?? new Error("No strategy succeeded")
  }

  const handleOAuthGithub = async (): Promise<void> => {
    setError(null)
    setLoadingProvider("github")
    try {
      await tryStrategies(GITHUB_CANDIDATES)
    } catch (err: any) {
      setError("GitHub sign-in failed.")
      setLoadingProvider(null)
    }
  }

  const handleOAuthGoogle = async (): Promise<void> => {
    setError(null)
    setLoadingProvider("google")
    try {
      await tryStrategies(GOOGLE_CANDIDATES)
    } catch (err: any) {
      setError("Google sign-in failed.")
      setLoadingProvider(null)
    }
  }

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    if (!isLoaded || !signIn) {
      setError("Auth system not ready")
      return
    }
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        window.location.href = "/"
        return
      }
      setError("Sign-in needs more steps.")
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? err?.message ?? "Sign-in failed")
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-white overflow-hidden">
      {/* Background - Mesh Gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundColor: "#f8fbff",
          backgroundImage: `
            radial-gradient(at 0% 0%, hsla(201,100%,92%,1) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(190,100%,95%,1) 0, transparent 50%), 
            radial-gradient(at 100% 100%, hsla(201,100%,92%,1) 0, transparent 50%), 
            radial-gradient(at 0% 100%, hsla(190,100%,95%,1) 0, transparent 50%)
          `,
        }}
      />

      {/* Background - Circular Lines */}
      <div className="absolute inset-0 z-1 opacity-40 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-200/50 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-blue-100/30 rounded-full" />
      </div>

      {/* Login Form - Centered and using the ORIGINAL design */}
      <div className="relative z-10 w-full max-w-xs rounded-sm shadow-xs p-6 bg-white z-[9999] border border-[#e4e4e4a8]">
        <h1 className="text-2xl font-light text-center text-black mr-30">Welcome to <img src="/logo_light.png" width={142} className="absolute mt-[-64px] ml-36" alt="" /></h1>
        <h1 className="text-2xl font-light text-center mb-4 text-[#939494]">Start building now</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Email"
            className="px-3 py-1 text-[13px] border border-[#e4e4e4a8] focus:border-[#0099ff]/50 focus:text-[#0099ff] focus:placeholder:text-[#0099ff] rounded-md focus:outline-none text-[#939494] placeholder:text-[#939494] placeholder:text-[13px]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="px-3 py-1 text-[13px] border border-[#e4e4e4a8] focus:border-[#0099ff]/50 focus:text-[#0099ff] focus:placeholder:text-[#0099ff] rounded-md focus:outline-none text-[#939494] placeholder:text-[#939494] placeholder:text-[13px]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-xs text-center">{error}</div>}
          <button className="mt-2 bg-[#0099ff]/20 text-[#0099ff] py-1 rounded-md text-sm cursor-pointer">Log in</button>
        </form>

        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={handleOAuthGoogle}
            className="flex items-center justify-center gap-2 rounded-md py-1 bg-[#e4e4e4a8] hover:bg-[#d6d6d6a8] text-[#3b3b3b] text-sm cursor-pointer"
            disabled={loadingProvider !== null}
          >
            <div className="w-4 h-5 flex items-center justify-center">
              {loadingProvider !== "google" && (
                <img alt="Google" src="/googlelogo.png" className="w-4 h-4 mr-2" />
              )}

              {loadingProvider === "google" ? (
                <div className="w-4 h-4 border-2 border-[#0099ff]/30 border-t-[#0099ff] rounded-full animate-spin" />
              ) : (
                "Google"
              )}
            </div>
          </button>

          <button
            onClick={handleOAuthGithub}
            className="flex items-center justify-center gap-2 rounded-md py-1 bg-[#e4e4e4a8] hover:bg-[#d6d6d6a8] text-[#3b3b3b] text-sm cursor-pointer"
            disabled={loadingProvider !== null}
          >
            <div className="w-4 h-5 flex items-center justify-center">
              {loadingProvider !== "github" && (
                <img alt="GitHub" src="/githublogo.png" className="w-4 h-4 mr-2" />
              )}

              {loadingProvider === "github" ? (
                <div className="w-4 h-4 border-2 border-white/60 border-t-black rounded-full animate-spin" />
              ) : (
                "GitHub"
              )}
            </div>

          </button>
        </div>

        <p className="text-center text-xs text-[#939494] mt-4">
          New in Falbor? <Link href={'/sign-up'} className="text-[#0099ff]">Sign up</Link>
        </p>
      </div>
    </div>
  )
}