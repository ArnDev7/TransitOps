'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  User, 
  Plus, 
  Search, 
  Phone, 
  Award, 
  FileText, 
  Calendar, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle,
  Filter,
  ShieldCheck
} from 'lucide-react'

interface Driver {
  id: string
  name: string
  license_number: string
  license_category: string
  license_expiry_date: string
  contact_number: string
  safety_score: number
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'
  created_at: string
  completed_trips?: number
}

interface DriversClientProps {
  initialDrivers: Driver[]
  userRole: string
}

export default function DriversClient({ initialDrivers, userRole }: DriversClientProps) {
  const supabase = createClient()
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseCategory, setLicenseCategory] = useState('')
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [safetyScore, setSafetyScore] = useState('100')
  const [status, setStatus] = useState<'Available' | 'On Trip' | 'Off Duty' | 'Suspended'>('Available')

  // Error/Success messages
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isFleetManager = userRole === 'fleet_manager'
  const isSafetyOfficer = userRole === 'safety_officer'
  const hasEditAccess = isFleetManager || isSafetyOfficer

  // Open modal for add
  const handleAddOpen = () => {
    setEditingDriver(null)
    setName('')
    setLicenseNumber('')
    setLicenseCategory('Class A')
    setLicenseExpiryDate('')
    setContactNumber('')
    setSafetyScore('100')
    setStatus('Available')
    setError(null)
    setSuccess(null)
    setIsModalOpen(true)
  }

  // Open modal for edit
  const handleEditOpen = (driver: Driver) => {
    setEditingDriver(driver)
    setName(driver.name)
    setLicenseNumber(driver.license_number)
    setLicenseCategory(driver.license_category)
    setLicenseExpiryDate(driver.license_expiry_date)
    setContactNumber(driver.contact_number || '')
    setSafetyScore(driver.safety_score.toString())
    setStatus(driver.status)
    setError(null)
    setSuccess(null)
    setIsModalOpen(true)
  }

  // Reload data
  const reloadDrivers = async () => {
    const { data, error: fetchErr } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false })
    if (!fetchErr && data) {
      setDrivers(data as Driver[])
    }
  }

  // Submit add or edit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const scoreParsed = parseFloat(safetyScore)
    if (isNaN(scoreParsed) || scoreParsed < 0 || scoreParsed > 100) {
      setError('Safety score must be between 0 and 100')
      setLoading(false)
      return
    }

    try {
      if (editingDriver) {
        // Prepare payload based on role restrictions
        let payload: any = {}
        if (isFleetManager) {
          payload = {
            name: name.trim(),
            license_number: licenseNumber.trim(),
            license_category: licenseCategory.trim(),
            license_expiry_date: licenseExpiryDate,
            contact_number: contactNumber.trim(),
            safety_score: scoreParsed,
            status,
          }
        } else if (isSafetyOfficer) {
          // Safety Officers can only manage driver compliance fields
          payload = {
            license_expiry_date: licenseExpiryDate,
            safety_score: scoreParsed,
          }
        }

        const { error: updateErr } = await supabase
          .from('drivers')
          .update(payload)
          .eq('id', editingDriver.id)

        if (updateErr) throw updateErr
        setSuccess('Driver profile updated successfully!')
      } else {
        // Add Driver (Fleet Manager only)
        if (!isFleetManager) {
          throw new Error('Access denied: Only Fleet Managers can register drivers.')
        }

        const { error: insertErr } = await supabase
          .from('drivers')
          .insert({
            name: name.trim(),
            license_number: licenseNumber.trim(),
            license_category: licenseCategory.trim(),
            license_expiry_date: licenseExpiryDate,
            contact_number: contactNumber.trim(),
            safety_score: scoreParsed,
            status,
          })

        if (insertErr) throw insertErr
        setSuccess('Driver registered successfully!')
      }
      
      await reloadDrivers()
      setTimeout(() => setIsModalOpen(false), 800)
    } catch (err: any) {
      setError(err.message || 'Error saving driver details. License number may already exist.')
    } finally {
      setLoading(false)
    }
  }

  // Delete driver
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this driver profile? This action cannot be undone.')) {
      return
    }
    try {
      const { error: deleteErr } = await supabase
        .from('drivers')
        .update({ status: 'Off Duty' }) // dummy/cascade check or delete
      // Actually we just call delete:
      const { error: realDeleteErr } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id)
      if (realDeleteErr) throw realDeleteErr
      setDrivers(drivers.filter(d => d.id !== id))
    } catch (err: any) {
      alert(err.message || 'Error removing driver profile. They might be assigned to trips.')
    }
  }

  // Quick Status Toggle Handler
  const handleQuickStatusToggle = async (driver: Driver, newStatus: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended') => {
    try {
      const { error: updateErr } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('id', driver.id)

      if (updateErr) throw updateErr

      // Update state locally
      setDrivers(drivers.map(d => d.id === driver.id ? { ...d, status: newStatus } : d))
    } catch (err: any) {
      alert(err.message || 'Error updating driver status')
    }
  }

  // Status badge colors helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'On Trip':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'Off Duty':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
      case 'Suspended':
        return 'bg-red-500/10 text-red-400 border border-red-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  // Safety score color helper
  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  // Filtered list
  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.license_number.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drivers Directory</h1>
          <p className="text-slate-400 text-sm mt-1">Manage driver credentials, safety performance, and scheduling availability.</p>
        </div>
        {isFleetManager && (
          <button
            onClick={handleAddOpen}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="h-5 w-5" />
            <span>Register Driver</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or license number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-500 pl-1">
        Rule: Expired license or Suspended status → blocked from trip assignment.
      </p>

      {/* Table of Drivers */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <User className="h-12 w-12 mx-auto text-slate-700 mb-3" />
          <p>No drivers found matching the search criteria.</p>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl overflow-x-auto shadow-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold bg-slate-900/50">
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">License No</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Trip Compl.</th>
                <th className="py-3 px-4 text-center">Safety</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredDrivers.map((driver) => {
                const isLicenseExpired = new Date(driver.license_expiry_date) < new Date();
                const canToggleStatus = isFleetManager || isSafetyOfficer;
                const isMidTrip = driver.status === 'On Trip';

                return (
                  <tr key={driver.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      <div className="flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-full bg-slate-850 flex items-center justify-center text-slate-400 border border-slate-800">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span>{driver.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-350">{driver.license_number}</td>
                    <td className="py-3 px-4 text-slate-300">{driver.license_category}</td>
                    <td className="py-3 px-4">
                      <span className={`${isLicenseExpired ? 'text-red-400 font-bold' : 'text-slate-300'}`}>
                        {driver.license_expiry_date}
                        {isLicenseExpired && ' ⚠ EXPIRED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{driver.contact_number || 'N/A'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-300">
                      {driver.completed_trips ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">
                      <span className={getSafetyScoreColor(driver.safety_score)}>
                        {driver.safety_score}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(driver.status)}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {/* Quick Status Toggle Button Group */}
                        {canToggleStatus && (
                          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850 space-x-0.5">
                            {['Available', 'On Trip', 'Off Duty', 'Suspended'].map((st) => {
                              const isCurrent = driver.status === st;
                              const disabled = (st === 'On Trip' && !isCurrent) || (isMidTrip && !isCurrent);
                              
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => handleQuickStatusToggle(driver, st as any)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                                    isCurrent
                                      ? 'bg-blue-600 text-white'
                                      : 'hover:bg-slate-900 text-slate-400'
                                  } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                  title={disabled ? "Cannot change status when driver is On Trip" : `Set ${st}`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Edit & Delete Buttons */}
                        {hasEditAccess && (
                          <div className="flex space-x-1.5">
                            <button
                              onClick={() => handleEditOpen(driver)}
                              className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
                              title={isSafetyOfficer ? 'Edit Compliance Only' : 'Edit Driver'}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {isFleetManager && (
                              <button
                                onClick={() => handleDelete(driver.id)}
                                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                title="Delete Driver"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-400" />
                <span>
                  {editingDriver 
                    ? isSafetyOfficer 
                      ? 'Edit Driver Compliance Fields' 
                      : 'Edit Driver Details' 
                    : 'Register New Driver'}
                </span>
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm mb-4 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg p-3 text-sm mb-4">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* If Safety Officer, hide all non-compliance fields */}
              {!isSafetyOfficer ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Driver Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Alex"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="+1 (555) 123-4567"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        License Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="DL-897213B"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        License Category
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Class A, Commercial"
                        value={licenseCategory}
                        onChange={(e) => setLicenseCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 text-xs text-slate-400">
                  You are editing this driver as a <strong className="text-blue-400">Safety Officer</strong>. You can only update compliance fields (license expiry and safety score).
                </div>
              )}

              {/* Compliance Fields (Editable by both Fleet Manager and Safety Officer) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    License Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Safety Score (0 - 100)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    placeholder="100"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Status Field (Fleet Manager only, safety officer doesn't edit driver availability status directly unless through compliance scoring, but let's hide to enforce strict RBAC) */}
              {isFleetManager && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Driver Availability Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              )}

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
                  {loading ? 'Saving...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
