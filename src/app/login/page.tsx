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
  const [selectedRole, setSelectedRole] = useState('fleet_manager')
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

        // Fetch user's database role
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (profileErr || !profile) {
          await supabase.auth.signOut()
          throw new Error('Invalid credentials')
        }

        // Compare selected role with actual db role
        if (profile.role !== selectedRole) {
          await supabase.auth.signOut()
          throw new Error('Invalid credentials')
        }

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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center relative overflow-hidden px-4 py-8">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="w-full max-w-6xl grid md:grid-cols-12 gap-8 items-stretch z-10">
        
        {/* Left Side: Brand & Product Info (One login, four roles list) */}
        <div className="md:col-span-6 bg-slate-900/40 border border-slate-900 backdrop-blur-xl rounded-2xl p-8 lg:p-12 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3 text-blue-400">
              <Truck className="h-10 w-10 animate-pulse" />
              <span className="text-2xl font-bold tracking-wider text-slate-100">TransitOps</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Smart Transport <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Operations Platform
              </span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time fleet tracking, atomic status-cascade trip dispatching, safety compliance monitoring, and automated financial analytics—unified in one secure operations interface.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400">One login, four roles</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { role: 'Fleet Manager', access: 'Fleet, Maintenance', desc: 'Oversees fleet assets, maintenance logs, and vehicle registry.' },
                { role: 'Dispatcher / Driver', access: 'Dashboard, Trips', desc: 'Creates trips, assigns vehicles & drivers, and logs fuel/expenses.' },
                { role: 'Safety Officer', access: 'Drivers, Compliance', desc: 'Monitors driver licensing, safety scores, and safety compliance.' },
                { role: 'Financial Analyst', access: 'Fuel & Expenses, Analytics', desc: 'Reviews operational costs, fuel efficiency, and ROI reports.' }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 text-xs">{item.role}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                      {item.access}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-450 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="md:col-span-6 bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 lg:p-12 shadow-2xl flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-6">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {!isSignUp && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Portal Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3.5 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="fleet_manager">Fleet Manager</option>
                    <option value="driver">Dispatcher</option>
                    <option value="safety_officer">Safety Officer</option>
                    <option value="financial_analyst">Financial Analyst</option>
                  </select>
                </div>
              )}

              {!isSignUp && (
                <div className="flex justify-between items-center text-xs pt-1">
                  <label className="flex items-center space-x-2 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Remember me</span>
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Password recovery is currently managed by administrative override."); }} className="text-blue-400 hover:text-blue-300 font-medium">
                    Forgot password?
                  </a>
                </div>
              )}

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
            <div className="bg-slate-950/80 border border-blue-950/50 rounded-lg p-3 mt-6 flex flex-col space-y-1 text-slate-400 text-[11px]">
              <span className="font-semibold text-blue-400 flex items-center space-x-1.5 mb-1">
                <Info className="h-3.5 w-3.5" />
                <span>Testing Demo Accounts</span>
              </span>
              <span>All signups default to <code className="text-slate-200">driver</code> role.</span>
              <span>Account lockout feature is planned as a future follow-up.</span>
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
