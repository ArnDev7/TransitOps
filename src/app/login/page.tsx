'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Shield, Truck, Key, Mail, ArrowRight, UserPlus, LogIn, Info } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpErr) throw signUpErr
        
        setMessage('Registration successful! If email confirmation is enabled, please check your email. Otherwise, you can sign in now.')
        setIsSignUp(false)
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInErr) throw signInErr

        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center relative overflow-hidden px-4">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center z-10">
        
        {/* Left Side: Brand & Product Info */}
        <div className="hidden md:flex flex-col space-y-6 pr-8">
          <div className="flex items-center space-x-3 text-blue-400">
            <Truck className="h-10 w-10 animate-pulse" />
            <span className="text-2xl font-bold tracking-wider text-slate-100">TransitOps</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Smart Transport <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Operations Platform
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Real-time fleet tracking, atomic status-cascade trip dispatching, safety compliance monitoring, and automated financial analytics—unified in one secure operations interface.
          </p>

          <div className="border-t border-slate-800/80 pt-6 mt-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-1">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-200">Role-Based Access Control</h4>
                <p className="text-sm text-slate-400">Policies enforced natively in the PostgreSQL layer for Fleet Managers, Drivers, Safety Officers, and Financial Analysts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl flex flex-col">
            
            <div className="flex md:hidden items-center justify-center space-x-3 text-blue-400 mb-6">
              <Truck className="h-8 w-8" />
              <span className="text-xl font-bold tracking-wider text-slate-100">TransitOps</span>
            </div>

            <div className="mb-6 text-center md:text-left">
              <h2 className="text-2xl font-bold text-slate-100">
                {isSignUp ? 'Create an Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {isSignUp ? 'Sign up to begin driver registration' : 'Sign in to access your dashboard'}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm mb-4">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 text-sm mb-4">
                {message}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30"
              >
                {loading ? (
                  <span>Loading...</span>
                ) : (
                  <>
                    <span>{isSignUp ? 'Register Account' : 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-slate-800/80 pt-6 mt-6 flex justify-between items-center text-xs text-slate-500">
              <span>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
              >
                {isSignUp ? (
                  <>
                    <LogIn className="h-3 w-3" />
                    <span>Sign In instead</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3" />
                    <span>Create one</span>
                  </>
                )}
              </button>
            </div>

            {/* Developer Help Section */}
            <div className="bg-slate-950/80 border border-blue-950 rounded-lg p-3 mt-6 flex flex-col space-y-1 text-slate-400 text-xs">
              <span className="font-semibold text-blue-400 flex items-center space-x-1.5 mb-1">
                <Info className="h-3.5 w-3.5" />
                <span>Testing Demo Accounts</span>
              </span>
              <span>All signups default to <code className="text-slate-200">driver</code> role.</span>
              <span>To test other roles, run this in Supabase SQL editor:</span>
              <pre className="bg-slate-900 text-blue-300 p-2 rounded mt-1 overflow-x-auto text-[10px] select-all font-mono leading-relaxed border border-slate-850">
UPDATE public.users{'\n'}SET role = 'fleet_manager'{'\n'}WHERE email = '{email || 'user@example.com'}';
              </pre>
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}
