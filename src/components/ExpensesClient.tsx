'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Coins, 
  Droplet, 
  Plus, 
  Search, 
  Car, 
  Calendar, 
  DollarSign, 
  Trash2, 
  X, 
  AlertCircle,
  CheckCircle2,
  Tag
} from 'lucide-react'

interface FuelLog {
  id: string
  vehicle_id: string
  liters: number
  cost: number
  date: string
  created_at: string
  vehicles: { name_model: string; registration_number: string } | null
}

interface Expense {
  id: string
  vehicle_id: string
  type: 'toll' | 'other'
  amount: number
  date: string
  created_at: string
  vehicles: { name_model: string; registration_number: string } | null
}

interface MaintenanceLog {
  cost: number
  vehicle_id: string
  created_at: string
}

interface SelectionVehicle {
  id: string
  name_model: string
  registration_number: string
}

interface ExpensesClientProps {
  initialFuelLogs: FuelLog[]
  initialExpenses: Expense[]
  userRole: string
  maintenanceLogs?: MaintenanceLog[]
}

export default function ExpensesClient({ initialFuelLogs, initialExpenses, userRole, maintenanceLogs }: ExpensesClientProps) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'fuel' | 'expenses'>('fuel')
  
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(initialFuelLogs)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [allVehicles, setAllVehicles] = useState<SelectionVehicle[]>([])
  
  // Filters
  const [vehicleFilter, setVehicleFilter] = useState('All')

  // Modals
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)

  // Fuel Form state
  const [fuelVehicleId, setFuelVehicleId] = useState('')
  const [liters, setLiters] = useState('')
  const [fuelCost, setFuelCost] = useState('')
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0])

  // Expense Form state
  const [expenseVehicleId, setExpenseVehicleId] = useState('')
  const [expenseType, setExpenseType] = useState<'toll' | 'other'>('toll')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])

  // Notifications
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isDriverOrManager = userRole === 'fleet_manager' || userRole === 'driver'

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, name_model, registration_number')
      .order('name_model', { ascending: true })
    if (data) setAllVehicles(data)
  }

  const reloadFuelLogs = async () => {
    const { data } = await supabase
      .from('fuel_logs')
      .select('*, vehicles(name_model, registration_number)')
      .order('date', { ascending: false })
    if (data) setFuelLogs(data as any[])
  }

  const reloadExpenses = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*, vehicles(name_model, registration_number)')
      .order('date', { ascending: false })
    if (data) setExpenses(data as any[])
  }

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const parsedLiters = parseFloat(liters)
    const parsedCost = parseFloat(fuelCost)

    if (isNaN(parsedLiters) || parsedLiters <= 0) {
      setError('Liters must be a positive number')
      setLoading(false)
      return
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      setError('Cost must be a non-negative number')
      setLoading(false)
      return
    }

    try {
      const { error: insertErr } = await supabase
        .from('fuel_logs')
        .insert({
          vehicle_id: fuelVehicleId,
          liters: parsedLiters,
          cost: parsedCost,
          date: fuelDate
        })

      if (insertErr) throw insertErr

      setSuccess('Fuel log registered successfully!')
      await reloadFuelLogs()
      setTimeout(() => {
        setIsFuelModalOpen(false)
        resetFuelForm()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Failed to submit fuel log')
    } finally {
      setLoading(false)
    }
  }

  const resetFuelForm = () => {
    setFuelVehicleId('')
    setLiters('')
    setFuelCost('')
    setFuelDate(new Date().toISOString().split('T')[0])
    setError(null)
    setSuccess(null)
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const parsedAmount = parseFloat(expenseAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Expense amount must be a positive number')
      setLoading(false)
      return
    }

    try {
      const { error: insertErr } = await supabase
        .from('expenses')
        .insert({
          vehicle_id: expenseVehicleId,
          type: expenseType,
          amount: parsedAmount,
          date: expenseDate
        })

      if (insertErr) throw insertErr

      setSuccess('Expense logged successfully!')
      await reloadExpenses()
      setTimeout(() => {
        setIsExpenseModalOpen(false)
        resetExpenseForm()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Failed to submit expense log')
    } finally {
      setLoading(false)
    }
  }

  const resetExpenseForm = () => {
    setExpenseVehicleId('')
    setExpenseType('toll')
    setExpenseAmount('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setError(null)
    setSuccess(null)
  }

  const handleDeleteFuel = async (id: string) => {
    if (!window.confirm('Delete this fuel log?')) return
    try {
      const { error: delErr } = await supabase
        .from('fuel_logs')
        .delete()
        .eq('id', id)
      if (delErr) throw delErr
      setFuelLogs(fuelLogs.filter(l => l.id !== id))
    } catch (err: any) {
      alert(err.message || 'Failed to delete fuel log')
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Delete this expense record?')) return
    try {
      const { error: delErr } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
      if (delErr) throw delErr
      setExpenses(expenses.filter(e => e.id !== id))
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense')
    }
  }

  // Filtered lists
  const filteredFuel = fuelLogs.filter(l => vehicleFilter === 'All' || l.vehicle_id === vehicleFilter)
  const filteredExpenses = expenses.filter(e => vehicleFilter === 'All' || e.vehicle_id === vehicleFilter)

  const getLinkedMaintCost = (vehicleId: string, expenseDate: string) => {
    const log = (maintenanceLogs || []).find((l) => {
      return l.vehicle_id === vehicleId && 
        new Date(l.created_at).toISOString().split('T')[0] === expenseDate
    })
    return log ? log.cost : 0
  }

  // Cost calculation
  const totalFuelCost = fuelLogs.reduce((sum, item) => sum + item.cost, 0)
  const totalMaintCost = (maintenanceLogs || []).reduce((sum, item) => sum + item.cost, 0)
  const totalOpCost = totalFuelCost + totalMaintCost

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fuel & Expenses</h1>
        <p className="text-slate-400 text-sm mt-1">Log vehicle fuel receipts and operational expenses like tolls.</p>
      </div>

      {/* Vehicle filter */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center space-x-3 w-full max-w-sm">
        <Car className="h-4 w-4 text-slate-500 shrink-0" />
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-350 focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="All">All Vehicles</option>
          {allVehicles.map(v => (
            <option key={v.id} value={v.id}>{v.name_model} ({v.registration_number})</option>
          ))}
        </select>
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

      {/* SECTION 1: Fuel Logs Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
          <h2 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
            <Droplet className="h-4.5 w-4.5 text-blue-400" />
            <span>Fuel Logs Registry</span>
          </h2>
          {isDriverOrManager && (
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center space-x-1.5 transition-all shadow-lg shadow-blue-900/25 uppercase tracking-wider"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Fuel</span>
            </button>
          )}
        </div>

        {filteredFuel.length === 0 ? (
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-10 text-center text-slate-500 text-xs">
            <Droplet className="h-10 w-10 mx-auto text-slate-700 mb-2" />
            <p>No fuel receipts logged for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-850 bg-slate-900/20 rounded-xl shadow-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Liters</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  {isDriverOrManager && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-350 font-medium">
                {filteredFuel.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {log.vehicles ? `${log.vehicles.name_model} (${log.vehicles.registration_number})` : 'Deleted Vehicle'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{log.date}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">{log.liters} L</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-400">${log.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    {isDriverOrManager && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteFuel(log.id)}
                          className="text-red-400 hover:text-red-305 p-1 rounded hover:bg-red-500/10 transition-all ml-auto block mr-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Other Expenses (Toll/Misc) Table */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-slate-850 pb-2">
          <h2 className="text-lg font-bold text-slate-200 flex items-center space-x-2">
            <Coins className="h-4.5 w-4.5 text-indigo-400" />
            <span>Other Expenses & Linked Maintenance</span>
          </h2>
          {isDriverOrManager && (
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center space-x-1.5 transition-all shadow-lg shadow-indigo-900/25 uppercase tracking-wider"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Expense</span>
            </button>
          )}
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-10 text-center text-slate-500 text-xs">
            <Coins className="h-10 w-10 mx-auto text-slate-700 mb-2" />
            <p>No expense logs found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-850 bg-slate-900/20 rounded-xl shadow-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Trip</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4 text-right">Toll</th>
                  <th className="py-3 px-4 text-right">Other</th>
                  <th className="py-3 px-4 text-right">Maint (linked)</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  {isDriverOrManager && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-350 font-medium">
                {filteredExpenses.map((exp) => {
                  const tollCost = exp.type === 'toll' ? exp.amount : 0
                  const otherCost = exp.type === 'other' ? exp.amount : 0
                  const linkedMaint = getLinkedMaintCost(exp.vehicle_id, exp.date)
                  const total = tollCost + otherCost + linkedMaint

                  return (
                    <tr key={exp.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono">-</td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {exp.vehicles ? `${exp.vehicles.name_model} (${exp.vehicles.registration_number})` : 'Deleted Vehicle'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {tollCost > 0 ? `$${tollCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {otherCost > 0 ? `$${otherCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-semibold">
                        {linkedMaint > 0 ? (
                          <span className="text-amber-400 font-bold">
                            ${linkedMaint.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">
                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      {isDriverOrManager && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-red-400 hover:text-red-305 p-1 rounded hover:bg-red-500/10 transition-all ml-auto block mr-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Aggregate Cost summary card */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Coins className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase tracking-wider block font-bold">Total Operational Cost (Auto)</span>
            <span className="text-[10px] text-slate-400">Calculated sum = Fuel Receipts (${totalFuelCost.toLocaleString()}) + Service Records (${totalMaintCost.toLocaleString()})</span>
          </div>
        </div>
        <div className="flex items-baseline space-x-3 bg-slate-950/50 py-2 px-4 rounded-lg border border-slate-850">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Op Cost:</span>
          <span className="text-xl font-extrabold text-slate-100">${totalOpCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Fuel Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Droplet className="h-5 w-5 text-blue-400" />
                <span>Log Fuel Receipt</span>
              </h2>
              <button onClick={() => setIsFuelModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Select Vehicle
                </label>
                <select
                  required
                  value={fuelVehicleId}
                  onChange={(e) => setFuelVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-350 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select vehicle...</option>
                  {allVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name_model} ({v.registration_number})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Liters
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="45.0"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Total Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="67.50"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFuelModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20"
                >
                  {loading ? 'Submitting...' : 'Log Fuel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Coins className="h-5 w-5 text-indigo-400" />
                <span>Log Expense</span>
              </h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Select Vehicle
                </label>
                <select
                  required
                  value={expenseVehicleId}
                  onChange={(e) => setExpenseVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-350 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select vehicle...</option>
                  {allVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name_model} ({v.registration_number})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Expense Type
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="toll">Toll</option>
                    <option value="other">Other / Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="12.50"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-900/20"
                >
                  {loading ? 'Submitting...' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
