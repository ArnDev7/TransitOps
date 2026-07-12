'use client'

import React from 'react'
import { Shield, Key, Eye, Check, AlertCircle } from 'lucide-react'

interface SettingsClientProps {
  userRole: string
}

export default function SettingsClient({ userRole }: SettingsClientProps) {
  const roleLabels: Record<string, string> = {
    fleet_manager: 'Fleet Manager',
    driver: 'Driver',
    safety_officer: 'Safety Officer',
    financial_analyst: 'Financial Analyst',
  }

  // Static matrix matching exact RLS Policies
  const rbacMatrix = [
    {
      screen: 'Dashboard',
      fleet_manager: 'Full Access',
      driver: 'Full Access',
      safety_officer: 'Full Access',
      financial_analyst: 'Full Access',
      rule: 'All authenticated roles can read overview counters and monitor trips.'
    },
    {
      screen: 'Vehicles',
      fleet_manager: 'Full Access',
      driver: 'Read Only',
      safety_officer: 'Read Only',
      financial_analyst: 'Read Only',
      rule: 'Only Fleet Manager can write/update vehicle registration details.'
    },
    {
      screen: 'Drivers',
      fleet_manager: 'Full Access',
      driver: 'Read Only',
      safety_officer: 'Edit Compliance & Status',
      financial_analyst: 'Read Only',
      rule: 'Safety Officer can update driver status/compliance; Fleet Manager has full CRUD.'
    },
    {
      screen: 'Trips',
      fleet_manager: 'Full Access',
      driver: 'Full Access',
      safety_officer: 'Read Only',
      financial_analyst: 'Read Only',
      rule: 'Fleet Manager and Dispatcher/Driver can plan, dispatch, and complete trips.'
    },
    {
      screen: 'Maintenance',
      fleet_manager: 'Full Access',
      driver: 'Read Only',
      safety_officer: 'Read Only',
      financial_analyst: 'Read Only',
      rule: 'Only Fleet Managers can create maintenance service logs or release vehicles.'
    },
    {
      screen: 'Fuel & Expenses',
      fleet_manager: 'Full Access',
      driver: 'Full Access',
      safety_officer: 'Read Only',
      financial_analyst: 'Read Only',
      rule: 'Fleet Manager and Driver can log fuel receipts and operational expense details.'
    },
    {
      screen: 'Reports & ROI',
      fleet_manager: 'Read Only',
      driver: 'Read Only',
      safety_officer: 'Read Only',
      financial_analyst: 'Read Only',
      rule: 'Informational ROI overview. CSV export is open to all authenticated users.'
    }
  ]

  const getCellBadge = (access: string) => {
    switch (access) {
      case 'Full Access':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Check className="h-3 w-3 mr-1" />
            Full Access
          </span>
        )
      case 'Edit Compliance & Status':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Key className="h-3 w-3 mr-1" />
            Compliance Edit
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/30">
            <Eye className="h-3 w-3 mr-1" />
            Read Only
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure workspace rules and audit system level permissions.</p>
      </div>

      {/* RLS Policy Notice Block */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-bold text-slate-200 text-base">Active RLS Security Profile</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            TransitOps enforces strict Row Level Security (RLS) policies at the Supabase database tier. 
            The matrix below outlines screen-level interaction rules derived from active role assertions. 
            To change these rules, update the PostgreSQL schema policies.
          </p>
          <div className="mt-3 flex items-center space-x-2 text-[10px] text-slate-400 bg-slate-950/40 py-1.5 px-3 rounded-lg border border-slate-850 w-fit">
            <span className="font-semibold">Your Current Role:</span>
            <span className="font-bold text-blue-400 px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/10">{roleLabels[userRole] || userRole}</span>
          </div>
        </div>
      </div>

      {/* RBAC Table Matrix */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg space-y-4">
        <div>
          <h2 className="font-bold text-lg text-slate-200 flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-400" />
            <span>Role-Based Access Control (RBAC) Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">INFORMATIONAL ONLY — derived from active Supabase RLS definitions.</p>
        </div>

        <div className="overflow-x-auto border border-slate-850 bg-slate-900/20 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-5">Screen Module</th>
                <th className="py-3.5 px-5 text-center">Fleet Manager</th>
                <th className="py-3.5 px-5 text-center">Dispatcher / Driver</th>
                <th className="py-3.5 px-5 text-center">Safety Officer</th>
                <th className="py-3.5 px-5 text-center">Financial Analyst</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-350">
              {rbacMatrix.map((row) => (
                <tr key={row.screen} className="hover:bg-slate-955/20 transition-colors">
                  <td className="py-4 px-5">
                    <span className="font-bold text-slate-200 block">{row.screen}</span>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{row.rule}</span>
                  </td>
                  <td className="py-4 px-5 text-center">{getCellBadge(row.fleet_manager)}</td>
                  <td className="py-4 px-5 text-center">{getCellBadge(row.driver)}</td>
                  <td className="py-4 px-5 text-center">{getCellBadge(row.safety_officer)}</td>
                  <td className="py-4 px-5 text-center">{getCellBadge(row.financial_analyst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
