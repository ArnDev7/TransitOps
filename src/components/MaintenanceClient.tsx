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
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [isActiveStatus, setIsActiveStatus] = useState(true)

  // Notification states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isFleetManager = userRole === 'fleet_manager'

  useEffect(() => {
    fetchVehicles()
  }, [])

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
      const insertData: any = {
        vehicle_id: selectedVehicleId,
        description: description.trim(),
        cost: parsedCost,
        is_active: isActiveStatus
      }

      if (serviceDate) {
        insertData.created_at = new Date(serviceDate).toISOString()
      }

      const { error: insertErr } = await supabase
        .from('maintenance_logs')
        .insert(insertData)

      if (insertErr) throw insertErr

      setSuccess(isActiveStatus ? 'Maintenance log registered! Vehicle status set to In Shop.' : 'Completed maintenance log registered!')
      await reloadLogs()
      setTimeout(() => {
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
    setServiceDate(new Date().toISOString().split('T')[0])
    setIsActiveStatus(true)
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
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Registry</h1>
          <p className="text-slate-400 text-sm mt-1">Schedule servicing, track maintenance logs, and manage repair logs.</p>
        </div>
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

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1/3): Log Service Record Form */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col space-y-4 h-fit">
          <div>
            <h2 className="font-bold text-base text-slate-200 flex items-center space-x-2">
              <Wrench className="h-4.5 w-4.5 text-blue-400" />
              <span>Log Service Record</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Record a new vehicle service entry directly.</p>
          </div>

          {isFleetManager ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Select Vehicle
                </label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select a vehicle...</option>
                  {allVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name_model} ({v.registration_number}) - {v.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Service Type / Description
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Schedule C oil change, brake alignment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="250"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 placeholder-slate-655 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={isActiveStatus ? 'Active' : 'Closed'}
                  onChange={(e) => setIsActiveStatus(e.target.value === 'Active')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Active">Active (In Shop)</option>
                  <option value="Closed">Closed (Completed)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/40 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-blue-900/20 uppercase tracking-wider"
              >
                {loading ? 'Registering...' : 'Register Service'}
              </button>
            </form>
          ) : (
            <div className="bg-slate-950/40 border border-slate-850 rounded-lg p-6 text-center text-slate-500 text-xs">
              <AlertCircle className="h-8 w-8 mx-auto text-slate-600 mb-2" />
              Access Restricted: Only Fleet Managers can log service records.
            </div>
          )}

          {/* Informational Lifecycle Diagram */}
          <div className="border-t border-slate-850 pt-4 mt-2">
            <h3 className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Service Lifecycle Flow</h3>
            <div className="space-y-2 text-[10px] font-semibold text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
              <div className="flex items-center space-x-1.5">
                <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 font-bold">Available</span>
                <span>→ (creating active record) →</span>
                <span className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 font-bold">In Shop</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 font-bold">In Shop</span>
                <span>→ (closing record, not retired) →</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 font-bold">Available</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-normal pt-1.5 italic font-medium">
                Note: In Shop vehicles are removed from the dispatch pool.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (2/3): Service Log List Table */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          {/* Filters Bar */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by model, registration, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-350 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="All">All Records</option>
              <option value="Active">Active Maintenance (In Shop)</option>
              <option value="Closed">Closed / Completed</option>
            </select>
          </div>

          {/* Service Log Table */}
          {filteredLogs.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center text-slate-500 flex-1 flex flex-col justify-center items-center">
              <Wrench className="h-12 w-12 text-slate-700 mb-3" />
              <p>No maintenance records found matching filters.</p>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl overflow-x-auto shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Service Description</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4">Date Logged</th>
                    <th className="py-3 px-4">Status</th>
                    {isFleetManager && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        <div>{log.vehicles?.name_model || 'Deleted Vehicle'}</div>
                        <code className="text-[10px] text-blue-450 font-mono tracking-wider">{log.vehicles?.registration_number}</code>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                        ${log.cost.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <div>{new Date(log.created_at).toLocaleDateString()}</div>
                        {log.closed_at && (
                          <div className="text-[9px] text-emerald-500 font-semibold mt-0.5">Closed {new Date(log.closed_at).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.is_active 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {log.is_active ? 'In Shop' : 'Completed'}
                        </span>
                      </td>
                      {isFleetManager && (
                        <td className="py-3.5 px-4 text-right">
                          {log.is_active && (
                            <button
                              onClick={() => handleCloseLog(log.id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors flex items-center space-x-1.5 ml-auto"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Complete & Release</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
