'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Truck, 
  LayoutDashboard, 
  Car, 
  Users, 
  Route, 
  Wrench, 
  Coins, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert,
  User,
  Settings
} from 'lucide-react'

interface DashboardLayoutWrapperProps {
  children: React.ReactNode
  user: {
    id: string
    email?: string
  }
  role: string
}

export default function DashboardLayoutWrapper({ children, user, role }: DashboardLayoutWrapperProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabels: Record<string, string> = {
    fleet_manager: 'Fleet Manager',
    driver: 'Driver',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
  }

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { name: 'Vehicles', href: '/vehicles', icon: Car, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { name: 'Drivers', href: '/drivers', icon: Users, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { name: 'Trips', href: '/trips', icon: Route, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { name: 'Fuel & Expenses', href: '/expenses', icon: Coins, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { name: 'Reports & ROI', href: '/reports', icon: BarChart3, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  ]

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(role))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-blue-400">
          <Truck className="h-6 w-6" />
          <span className="font-bold text-lg text-slate-100">TransitOps</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="text-slate-400 hover:text-slate-100 focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="flex items-center space-x-3 px-6 py-6 border-b border-slate-800/60">
          <Truck className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold tracking-wider text-slate-100">TransitOps</span>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-400">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold truncate max-w-[150px] text-slate-200" title={user.email}>
              {user.email}
            </span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20">
            {roleLabels[role] || role}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                }`} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout Bottom */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-200 group"
          >
            <LogOut className="h-5 w-5 shrink-0 text-red-400 group-hover:translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/80 backdrop-blur-sm">
          <div className="w-64 bg-slate-900 border-r border-slate-800 h-full flex flex-col p-6 animate-in slide-in-from-left duration-250">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-2 text-blue-400">
                <Truck className="h-6 w-6" />
                <span className="font-bold text-lg text-slate-100">TransitOps</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 p-4 rounded-lg bg-slate-950/40 border border-slate-800">
              <span className="text-xs text-slate-500 block mb-1">Signed in as</span>
              <span className="text-sm font-semibold truncate text-slate-200 block mb-2">{user.email}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-400/10 text-blue-400 border border-blue-400/20">
                {roleLabels[role] || role}
              </span>
            </div>

            <nav className="flex-1 space-y-1">
              {filteredMenuItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            <button
              onClick={() => {
                setMobileMenuOpen(false)
                handleLogout()
              }}
              className="flex w-full items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors mt-auto"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  )
}
