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
        .delete()
        .eq('id', id)
      if (deleteErr) throw deleteErr
      setDrivers(drivers.filter(d => d.id !== id))
    } catch (err: any) {
      alert(err.message || 'Error removing driver profile. They might be assigned to trips.')
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

      {/* Grid of Drivers */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <User className="h-12 w-12 mx-auto text-slate-700 mb-3" />
          <p>No drivers found matching the search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => {
            const isLicenseExpired = new Date(driver.license_expiry_date) < new Date()
            return (
              <div 
                key={driver.id} 
                className="bg-slate-900/40 border border-slate-850 hover:border-slate-750 transition-all rounded-xl p-5 flex flex-col relative overflow-hidden group shadow-lg"
              >
                {/* Status indicator banner if license expired */}
                {isLicenseExpired && (
                  <div className="absolute top-0 right-0 left-0 bg-red-650 text-white text-[10px] uppercase font-bold py-1 px-4 text-center tracking-wider">
                    License Expired
                  </div>
                )}

                {/* Card top details */}
                <div className={`flex justify-between items-start mb-4 ${isLicenseExpired ? 'mt-4' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-slate-850 flex items-center justify-center text-slate-300 border border-slate-800 group-hover:border-blue-500 transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">{driver.name}</h3>
                      <span className="text-xs text-slate-400">{driver.contact_number || 'No contact number'}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${getStatusBadge(driver.status)}`}>
                    {driver.status}
                  </span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-400 border-t border-b border-slate-850 py-3.5 my-3.5">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate" title={driver.license_number}>{driver.license_number}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate">{driver.license_category}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className={`truncate ${isLicenseExpired ? 'text-red-400 font-semibold' : ''}`}>
                      Exp: {driver.license_expiry_date}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="truncate">
                      Score: <strong className={getSafetyScoreColor(driver.safety_score)}>{driver.safety_score}</strong>
                    </span>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex justify-between items-center mt-auto pt-2">
                  <span className="text-xs text-slate-500">
                    {isSafetyOfficer ? 'Safety Managed' : 'All Roles'}
                  </span>
                  {hasEditAccess && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditOpen(driver)}
                        className="p-2 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors flex items-center space-x-1.5 text-xs font-medium"
                        title={isSafetyOfficer ? 'Edit Compliance Only' : 'Edit Driver'}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        {isSafetyOfficer && <span>Compliance</span>}
                      </button>
                      {isFleetManager && (
                        <button
                          onClick={() => handleDelete(driver.id)}
                          className="p-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Driver"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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
