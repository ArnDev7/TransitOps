'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Wrench, 
  Plus, 
  Search, 
  Car, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Trash2, 
  X, 
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react'

interface MaintenanceLog {
  id: string
  vehicle_id: string
  description: string
  cost: number
  is_active: boolean
  created_at: string
  closed_at: string | null
  vehicles: { name_model: string; registration_number: string; status: string } | null
}

interface SelectionVehicle {
  id: string
  name_model: string
  registration_number: string
  status: string
}

interface MaintenanceClientProps {
  initialLogs: MaintenanceLog[]
  userRole: string
}

export default function MaintenanceClient({ initialLogs, userRole }: MaintenanceClientProps) {
  const supabase = createClient()
  const [logs, setLogs] = useState<MaintenanceLog[]>(initialLogs)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [allVehicles, setAllVehicles] = useState<SelectionVehicle[]>([])

  // Form state
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [description, setDescription] = useState('')
  const [cost, setCost] = useState('0')

  // Notification states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isFleetManager = userRole === 'fleet_manager'

  useEffect(() => {
    if (isModalOpen) {
      fetchVehicles()
    }
  }, [isModalOpen])

  const fetchVehicles = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('vehicles')
        .select('id, name_model, registration_number, status')
        .neq('status', 'Retired')
      
      if (fetchErr) throw fetchErr
      setAllVehicles(data || [])
    } catch (err: any) {
      setError('Error loading vehicles: ' + err.message)
    }
  }

  const reloadLogs = async () => {
    const { data, error: fetchErr } = await supabase
      .from('maintenance_logs')
      .select(`
        *,
        vehicles ( name_model, registration_number, status )
      `)
      .order('created_at', { ascending: false })
    
    if (!fetchErr && data) {
      setLogs(data as any[])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const parsedCost = parseFloat(cost)
    if (isNaN(parsedCost) || parsedCost < 0) {
      setError('Maintenance cost must be a non-negative number')
      setLoading(false)
      return
    }

    try {
      const { error: insertErr } = await supabase
        .from('maintenance_logs')
        .insert({
          vehicle_id: selectedVehicleId,
          description: description.trim(),
          cost: parsedCost,
          is_active: true
        })

      if (insertErr) throw insertErr

      setSuccess('Maintenance log registered! Vehicle status set to In Shop.')
      await reloadLogs()
      setTimeout(() => {
        setIsModalOpen(false)
        resetForm()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Failed to submit maintenance log')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedVehicleId('')
    setDescription('')
    setCost('0')
    setError(null)
    setSuccess(null)
  }

  const handleCloseLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to close this maintenance log? The vehicle will be restored to Available status.')) {
      return
    }
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: updateErr } = await supabase
        .from('maintenance_logs')
        .update({ is_active: false })
        .eq('id', logId)

      if (updateErr) throw updateErr

      setSuccess('Maintenance log closed and vehicle returned to service.')
      await reloadLogs()
    } catch (err: any) {
      setError(err.message || 'Failed to close maintenance log')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to delete this maintenance log?')) {
      return
    }
    try {
      const { error: deleteErr } = await supabase
        .from('maintenance_logs')
        .delete()
        .eq('id', logId)

      if (deleteErr) throw deleteErr
      setLogs(logs.filter(l => l.id !== logId))
    } catch (err: any) {
      alert(err.message || 'Failed to delete maintenance log')
    }
  }

  // Filtered List
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.vehicles?.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.vehicles?.name_model.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Active' && log.is_active) || 
      (statusFilter === 'Closed' && !log.is_active)

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Logs</h1>
          <p className="text-slate-400 text-sm mt-1">Schedule servicing, track maintenance logs, and manage repair logs.</p>
        </div>
        {isFleetManager && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="h-5 w-5" />
            <span>Log Maintenance</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by model, registration, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="All">All Records</option>
          <option value="Active">Active Maintenance (In Shop)</option>
          <option value="Closed">Closed / Completed</option>
        </select>
      </div>

      {/* List / Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <Wrench className="h-12 w-12 mx-auto text-slate-700 mb-3" />
          <p>No maintenance records found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLogs.map((log) => (
            <div 
              key={log.id}
              className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 flex flex-col relative shadow-lg"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-200 text-base">{log.vehicles?.name_model}</h3>
                  <code className="text-xs text-blue-400 font-mono tracking-wider">{log.vehicles?.registration_number}</code>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  log.is_active 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {log.is_active ? 'In Shop' : 'Completed'}
                </span>
              </div>

              {/* Description */}
              <div className="flex items-start space-x-2.5 text-sm text-slate-300 bg-slate-950/30 p-3 rounded-lg border border-slate-850/60 mb-4 flex-1">
                <FileText className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{log.description}</p>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4">
                <span className="flex items-center">
                  <DollarSign className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Cost: <strong className="text-slate-200 ml-1">${log.cost.toLocaleString()}</strong>
                </span>
                <span className="flex items-center">
                  <Calendar className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  Created: <strong className="text-slate-200 ml-1">{new Date(log.created_at).toLocaleDateString()}</strong>
                </span>
                {log.closed_at && (
                  <span className="flex items-center col-span-2 mt-1">
                    <Clock className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    Closed: <strong className="text-slate-200 ml-1">{new Date(log.closed_at).toLocaleDateString()}</strong>
                  </span>
                )}
              </div>

              {/* Actions */}
              {isFleetManager && (
                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-850/60">
                  {log.is_active && (
                    <button
                      onClick={() => handleCloseLog(log.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center space-x-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Complete & Release</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                    title="Delete log record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Wrench className="h-5 w-5 text-blue-400" />
                <span>Log Vehicle Maintenance</span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Select Vehicle
                </label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-350 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select a vehicle...</option>
                  {allVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name_model} ({v.registration_number}) - Status: {v.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description of Works
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Schedule C Engine Overhaul and transmission oil change."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Maintenance Cost ($)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="250"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20"
                >
                  {loading ? 'Submitting...' : 'Register Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
