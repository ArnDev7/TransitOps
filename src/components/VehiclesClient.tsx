'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Car, 
  Plus, 
  Search, 
  MapPin, 
  Scale, 
  Gauge, 
  DollarSign, 
  Edit2, 
  Trash2, 
  X, 
  AlertCircle,
  Filter
} from 'lucide-react'

interface Vehicle {
  id: string
  registration_number: string
  name_model: string
  type: string
  max_load_capacity: number
  odometer: number
  acquisition_cost: number
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired'
  region: string
  created_at: string
}

interface VehiclesClientProps {
  initialVehicles: Vehicle[]
  userRole: string
}

export default function VehiclesClient({ initialVehicles, userRole }: VehiclesClientProps) {
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [regionFilter, setRegionFilter] = useState('All')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  
  // Form state
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [nameModel, setNameModel] = useState('')
  const [type, setType] = useState('Van')
  const [maxLoadCapacity, setMaxLoadCapacity] = useState('')
  const [odometer, setOdometer] = useState('')
  const [acquisitionCost, setAcquisitionCost] = useState('')
  const [status, setStatus] = useState<'Available' | 'On Trip' | 'In Shop' | 'Retired'>('Available')
  const [region, setRegion] = useState('Global')

  // Error/Success messages
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isFleetManager = userRole === 'fleet_manager'

  // Unique lists for filter dropdowns
  const vehicleTypes = ['All', ...Array.from(new Set(vehicles.map(v => v.type)))]
  const regions = ['All', ...Array.from(new Set(vehicles.map(v => v.region)))]

  // Open modal for add
  const handleAddOpen = () => {
    setEditingVehicle(null)
    setRegistrationNumber('')
    setNameModel('')
    setType('Van')
    setMaxLoadCapacity('')
    setOdometer('0')
    setAcquisitionCost('0')
    setStatus('Available')
    setRegion('Global')
    setError(null)
    setSuccess(null)
    setIsModalOpen(true)
  }

  // Open modal for edit
  const handleEditOpen = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setRegistrationNumber(vehicle.registration_number)
    setNameModel(vehicle.name_model)
    setType(vehicle.type)
    setMaxLoadCapacity(vehicle.max_load_capacity.toString())
    setOdometer(vehicle.odometer.toString())
    setAcquisitionCost(vehicle.acquisition_cost.toString())
    setStatus(vehicle.status)
    setRegion(vehicle.region)
    setError(null)
    setSuccess(null)
    setIsModalOpen(true)
  }

  // Reload data
  const reloadVehicles = async () => {
    const { data, error: fetchErr } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!fetchErr && data) {
      setVehicles(data as Vehicle[])
    }
  }

  // Submit add or edit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const parsedCapacity = parseFloat(maxLoadCapacity)
    const parsedOdometer = parseFloat(odometer)
    const parsedCost = parseFloat(acquisitionCost)

    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      setError('Maximum load capacity must be a positive number')
      setLoading(false)
      return
    }
    if (isNaN(parsedOdometer) || parsedOdometer < 0) {
      setError('Odometer must be a non-negative number')
      setLoading(false)
      return
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      setError('Acquisition cost must be a non-negative number')
      setLoading(false)
      return
    }

    try {
      if (editingVehicle) {
        // Edit Vehicle
        const { error: updateErr } = await supabase
          .from('vehicles')
          .update({
            registration_number: registrationNumber.trim(),
            name_model: nameModel.trim(),
            type,
            max_load_capacity: parsedCapacity,
            odometer: parsedOdometer,
            acquisition_cost: parsedCost,
            status,
            region: region.trim(),
          })
          .eq('id', editingVehicle.id)

        if (updateErr) throw updateErr
        setSuccess('Vehicle updated successfully!')
      } else {
        // Add Vehicle
        const { error: insertErr } = await supabase
          .from('vehicles')
          .insert({
            registration_number: registrationNumber.trim(),
            name_model: nameModel.trim(),
            type,
            max_load_capacity: parsedCapacity,
            odometer: parsedOdometer,
            acquisition_cost: parsedCost,
            status,
            region: region.trim(),
          })

        if (insertErr) throw insertErr
        setSuccess('Vehicle added successfully!')
      }
      
      await reloadVehicles()
      setTimeout(() => setIsModalOpen(false), 800)
    } catch (err: any) {
      setError(err.message || 'Error saving vehicle details. Registration number may already exist.')
    } finally {
      setLoading(false)
    }
  }

  // Delete vehicle
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) {
      return
    }
    try {
      const { error: deleteErr } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)
      if (deleteErr) throw deleteErr
      setVehicles(vehicles.filter(v => v.id !== id))
    } catch (err: any) {
      alert(err.message || 'Error deleting vehicle. It might be referenced in trips.')
    }
  }

  // Status badge colors helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'On Trip':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'In Shop':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'Retired':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  // Filtered list
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = 
      v.name_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter
    const matchesType = typeFilter === 'All' || v.type === typeFilter
    const matchesRegion = regionFilter === 'All' || v.region === regionFilter

    return matchesSearch && matchesStatus && matchesType && matchesRegion
  })

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicles Registry</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and track fleet vehicles status, load capacity, and costs.</p>
        </div>
        {isFleetManager && (
          <button
            onClick={handleAddOpen}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="h-5 w-5" />
            <span>Add Vehicle</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by model or reg number..."
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
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="All">All Types</option>
          {vehicleTypes.filter(t => t !== 'All').map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* Region Filter */}
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="All">All Regions</option>
          {regions.filter(r => r !== 'All').map((reg) => (
            <option key={reg} value={reg}>{reg}</option>
          ))}
        </select>
      </div>

      {/* Grid of Vehicles */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <Car className="h-12 w-12 mx-auto text-slate-700 mb-3" />
          <p>No vehicles found matching the search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div 
              key={vehicle.id} 
              className="bg-slate-900/40 border border-slate-850 hover:border-slate-750 transition-all rounded-xl p-5 flex flex-col relative overflow-hidden group shadow-lg"
            >
              {/* Card top details */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-200 text-lg group-hover:text-white transition-colors">{vehicle.name_model}</h3>
                  <code className="text-xs text-blue-400 font-mono tracking-wider">{vehicle.registration_number}</code>
                </div>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${getStatusBadge(vehicle.status)}`}>
                  {vehicle.status}
                </span>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-400 border-t border-b border-slate-850 py-3.5 my-3.5">
                <div className="flex items-center space-x-2">
                  <Scale className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">{vehicle.max_load_capacity} kg limit</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">{vehicle.odometer} km</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">{vehicle.region}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">${vehicle.acquisition_cost.toLocaleString()}</span>
                </div>
              </div>

              {/* Card actions */}
              <div className="flex justify-between items-center mt-auto pt-2">
                <span className="text-xs text-slate-500">Type: <strong className="text-slate-350">{vehicle.type}</strong></span>
                {isFleetManager && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditOpen(vehicle)}
                      className="p-2 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="p-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete Vehicle"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Car className="h-5 w-5 text-blue-400" />
                <span>{editingVehicle ? 'Edit Vehicle Details' : 'Register New Vehicle'}</span>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VAN-05"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Name / Model
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ford Transit"
                    value={nameModel}
                    onChange={(e) => setNameModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Van, Semi, Truck"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Max Load Capacity (kg)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="500"
                    value={maxLoadCapacity}
                    onChange={(e) => setMaxLoadCapacity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Current Odometer (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Acquisition Cost ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="25000"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Operating Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Operating Region
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North, Global"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
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
                  {loading ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
