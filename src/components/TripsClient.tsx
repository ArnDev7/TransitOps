'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Route, 
  Plus, 
  MapPin, 
  User, 
  Car, 
  Scale, 
  Gauge, 
  Droplet, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Send,
  AlertCircle,
  X,
  Clock
} from 'lucide-react'

interface Trip {
  id: string
  source: string
  destination: string
  vehicle_id: string
  driver_id: string
  cargo_weight: number
  planned_distance: number
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled'
  final_odometer: number | null
  fuel_consumed: number | null
  revenue: number
  created_at: string
  dispatched_at: string | null
  completed_at: string | null
  vehicles: { name_model: string; registration_number: string; max_load_capacity: number; odometer: number } | null
  drivers: { name: string; license_number: string; safety_score: number } | null
}

interface SelectionVehicle {
  id: string
  name_model: string
  registration_number: string
  max_load_capacity: number
  odometer: number
}

interface SelectionDriver {
  id: string
  name: string
  license_number: string
  license_expiry_date: string
}

interface TripsClientProps {
  initialTrips: Trip[]
  userRole: string
}

export default function TripsClient({ initialTrips, userRole }: TripsClientProps) {
  const supabase = createClient()
  const [trips, setTrips] = useState<Trip[]>(initialTrips)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null)

  // Real-time selection lists
  const [availableVehicles, setAvailableVehicles] = useState<SelectionVehicle[]>([])
  const [availableDrivers, setAvailableDrivers] = useState<SelectionDriver[]>([])

  // Create Form State
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [cargoWeight, setCargoWeight] = useState('')
  const [plannedDistance, setPlannedDistance] = useState('')
  const [revenue, setRevenue] = useState('0')

  // Complete Form State
  const [finalOdometer, setFinalOdometer] = useState('')
  const [fuelConsumed, setFuelConsumed] = useState('')
  const [fuelCost, setFuelCost] = useState('')

  // Notifications
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isDriverOrManager = userRole === 'fleet_manager' || userRole === 'driver'

  useEffect(() => {
    if (isCreateOpen) {
      fetchAvailableAssets()
    }
  }, [isCreateOpen])

  // Fetch available vehicles and drivers
  const fetchAvailableAssets = async () => {
    setError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Query Available vehicles
      const { data: vehs, error: vehErr } = await supabase
        .from('vehicles')
        .select('id, name_model, registration_number, max_load_capacity, odometer')
        .eq('status', 'Available')

      if (vehErr) throw vehErr
      setAvailableVehicles(vehs || [])

      // Query Available drivers with non-expired licenses
      const { data: drvs, error: drvErr } = await supabase
        .from('drivers')
        .select('id, name, license_number, license_expiry_date')
        .eq('status', 'Available')
        .gte('license_expiry_date', today)

      if (drvErr) throw drvErr
      setAvailableDrivers(drvs || [])
    } catch (err: any) {
      setError('Error loading available vehicles or drivers: ' + err.message)
    }
  }

  // Reload trips lists
  const reloadTrips = async () => {
    const { data, error: fetchErr } = await supabase
      .from('trips')
      .select(`
        *,
        vehicles ( name_model, registration_number, max_load_capacity, odometer ),
        drivers ( name, license_number, safety_score )
      `)
      .order('created_at', { ascending: false })
    
    if (!fetchErr && data) {
      setTrips(data as any[])
    }
  }

  // Create Trip handler
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const parsedWeight = parseFloat(cargoWeight)
    const parsedDistance = parseFloat(plannedDistance)
    const parsedRevenue = parseFloat(revenue)

    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setError('Cargo weight must be a positive number')
      setLoading(false)
      return
    }
    if (isNaN(parsedDistance) || parsedDistance <= 0) {
      setError('Planned distance must be a positive number')
      setLoading(false)
      return
    }
    if (isNaN(parsedRevenue) || parsedRevenue < 0) {
      setError('Revenue must be a non-negative number')
      setLoading(false)
      return
    }

    try {
      const { error: insertErr } = await supabase
        .from('trips')
        .insert({
          source: source.trim(),
          destination: destination.trim(),
          vehicle_id: selectedVehicleId,
          driver_id: selectedDriverId,
          cargo_weight: parsedWeight,
          planned_distance: parsedDistance,
          revenue: parsedRevenue,
          status: 'Draft'
        })

      if (insertErr) throw insertErr

      setSuccess('Trip draft created successfully!')
      await reloadTrips()
      setTimeout(() => {
        setIsCreateOpen(false)
        resetCreateForm()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Failed to create trip')
    } finally {
      setLoading(false)
    }
  }

  // Reset Form
  const resetCreateForm = () => {
    setSource('')
    setDestination('')
    setSelectedVehicleId('')
    setSelectedDriverId('')
    setCargoWeight('')
    setPlannedDistance('')
    setRevenue('0')
    setError(null)
    setSuccess(null)
  }

  // Dispatch Trip handler (Draft -> Dispatched)
  const handleDispatch = async (tripId: string) => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: dispatchErr } = await supabase
        .from('trips')
        .update({ status: 'Dispatched' })
        .eq('id', tripId)

      if (dispatchErr) throw dispatchErr

      setSuccess('Trip dispatched successfully! Vehicle and driver are now On Trip.')
      await reloadTrips()
    } catch (err: any) {
      setError(err.message || 'Dispatch failed. Verify load capacity or status.')
    } finally {
      setLoading(false)
    }
  }

  // Cancel Trip handler (Draft or Dispatched -> Cancelled)
  const handleCancel = async (tripId: string) => {
    if (!window.confirm('Are you sure you want to cancel this trip? Vehicles and drivers will return to Available.')) {
      return
    }
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { error: cancelErr } = await supabase
        .from('trips')
        .update({ status: 'Cancelled' })
        .eq('id', tripId)

      if (cancelErr) throw cancelErr

      setSuccess('Trip cancelled successfully.')
      await reloadTrips()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel trip')
    } finally {
      setLoading(false)
    }
  }

  // Open Complete Dialog
  const handleCompleteOpen = (trip: Trip) => {
    setActiveTrip(trip)
    setFinalOdometer(trip.vehicles ? (trip.vehicles.odometer + trip.planned_distance).toString() : '')
    setFuelConsumed('')
    setFuelCost('')
    setError(null)
    setSuccess(null)
    setIsCompleteOpen(true)
  }

  // Complete Trip handler (Dispatched -> Completed)
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTrip) return
    setError(null)
    setSuccess(null)
    setLoading(true)

    const parsedOdometer = parseFloat(finalOdometer)
    const parsedFuel = parseFloat(fuelConsumed)
    const parsedCost = parseFloat(fuelCost || '0')

    if (isNaN(parsedOdometer) || parsedOdometer <= 0) {
      setError('Final odometer reading is required and must be positive')
      setLoading(false)
      return
    }
    if (isNaN(parsedFuel) || parsedFuel <= 0) {
      setError('Fuel consumed is required and must be positive')
      setLoading(false)
      return
    }
    if (isNaN(parsedCost) || parsedCost < 0) {
      setError('Fuel cost must be non-negative')
      setLoading(false)
      return
    }

    try {
      // 1. Update trip status
      const { error: completeErr } = await supabase
        .from('trips')
        .update({
          status: 'Completed',
          final_odometer: parsedOdometer,
          fuel_consumed: parsedFuel
        })
        .eq('id', activeTrip.id)

      if (completeErr) throw completeErr

      // 2. Create the corresponding fuel log
      const { error: fuelErr } = await supabase
        .from('fuel_logs')
        .insert({
          vehicle_id: activeTrip.vehicle_id,
          liters: parsedFuel,
          cost: parsedCost,
          date: new Date().toISOString().split('T')[0]
        })

      if (fuelErr) throw fuelErr

      setSuccess('Trip completed! Vehicle/driver returned to Available, and fuel log recorded.')
      await reloadTrips()
      setTimeout(() => {
        setIsCompleteOpen(false)
        setActiveTrip(null)
      }, 800)
    } catch (err: any) {
      setError(err.message || 'Failed to complete trip. Check odometer sequence.')
    } finally {
      setLoading(false)
    }
  }

  // Status Colors Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
      case 'Dispatched':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-500/20'
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
    }
  }

  const selectedVehicleObj = availableVehicles.find(v => v.id === selectedVehicleId);
  const cargoWeightNum = parseFloat(cargoWeight);
  const maxCapacityVal = selectedVehicleObj?.max_load_capacity || 0;
  const isCargoOverloaded = selectedVehicleObj && !isNaN(cargoWeightNum) && cargoWeightNum > maxCapacityVal;
  const cargoExceededAmt = isCargoOverloaded ? cargoWeightNum - maxCapacityVal : 0;

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trip Dispatch Center</h1>
          <p className="text-slate-400 text-sm mt-1">Dispatch cargo trips, manage schedules, and track vehicle statuses.</p>
        </div>
        {isDriverOrManager && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="h-5 w-5" />
            <span>Create Trip</span>
          </button>
        )}
      </div>

      {/* Message Notifications */}
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

      {/* Trips list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 column: main trips log */}
        <div className="lg:col-span-2 space-y-6">
          {trips.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
              <Route className="h-12 w-12 mx-auto text-slate-700 mb-3" />
              <p>No trips registered in the system.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {trips.map((trip) => (
                <div 
                  key={trip.id}
                  className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 flex flex-col relative group hover:border-slate-800 transition-all shadow-lg text-xs"
                >
                  {/* Trip Header */}
                  <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-850">
                    <div>
                      <span className="text-xs text-slate-500 block">Trip ID</span>
                      <code className="text-xs text-blue-400 font-mono tracking-wider">{trip.id.substring(0, 8)}...</code>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${getStatusBadge(trip.status)}`}>
                      {trip.status}
                    </span>
                  </div>

                  {/* Route Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-slate-950/30 p-3 rounded-lg border border-slate-850/60">
                    <div className="flex items-start space-x-2.5">
                      <MapPin className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Source</span>
                        <span className="text-sm font-semibold text-slate-200">{trip.source}</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <MapPin className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Destination</span>
                        <span className="text-sm font-semibold text-slate-200">{trip.destination}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle & Driver Assignments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 mb-4">
                    <div className="flex items-center space-x-2.5">
                      <Car className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="truncate">
                        Vehicle: <strong className="text-slate-355">{trip.vehicles ? `${trip.vehicles.name_model} (${trip.vehicles.registration_number})` : 'Deleted Vehicle'}</strong>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <User className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="truncate">
                        Driver: <strong className="text-slate-355">{trip.drivers ? trip.drivers.name : 'Deleted Driver'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Logistics & Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950/40 py-2.5 rounded-lg border border-slate-850 mb-4">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Cargo Weight</span>
                      <span className="font-bold text-slate-300 flex items-center justify-center">
                        <Scale className="h-3.5 w-3.5 mr-1 text-slate-550" />
                        {trip.cargo_weight} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Distance</span>
                      <span className="font-bold text-slate-300 flex items-center justify-center">
                        <Gauge className="h-3.5 w-3.5 mr-1 text-slate-550" />
                        {trip.planned_distance} km
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Revenue</span>
                      <span className="font-bold text-blue-400 flex items-center justify-center">
                        <DollarSign className="h-3.5 w-3.5 mr-0.5 text-blue-500" />
                        {trip.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Complete Odometer / Fuel logs summary */}
                  {trip.status === 'Completed' && (
                    <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-lg p-3 text-xs text-slate-400 mb-4 grid grid-cols-2 gap-2">
                      <span className="flex items-center">
                        <Gauge className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                        Final Odometer: <strong className="text-slate-200 ml-1">{trip.final_odometer} km</strong>
                      </span>
                      <span className="flex items-center">
                        <Droplet className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                        Fuel Consumed: <strong className="text-slate-200 ml-1">{trip.fuel_consumed} L</strong>
                      </span>
                    </div>
                  )}

                  {/* Actions based on state */}
                  {isDriverOrManager && (
                    <div className="flex space-x-2 mt-auto pt-3 border-t border-slate-850/60 justify-end">
                      {trip.status === 'Draft' && (
                        <>
                          <button
                            onClick={() => handleCancel(trip.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-850 hover:bg-slate-800 text-slate-350 transition-colors"
                          >
                            Cancel Draft
                          </button>
                          <button
                            onClick={() => handleDispatch(trip.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center space-x-1"
                          >
                            <Send className="h-3 w-3" />
                            <span>Dispatch Trip</span>
                          </button>
                        </>
                      )}

                      {trip.status === 'Dispatched' && (
                        <>
                          <button
                            onClick={() => handleCancel(trip.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-650 hover:bg-red-600 text-white transition-colors"
                          >
                            Cancel Dispatch
                          </button>
                          <button
                            onClick={() => handleCompleteOpen(trip)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center space-x-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Complete Trip</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1/3 column: Live Board panel */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col h-fit space-y-4">
          <div>
            <h2 className="font-bold text-lg text-slate-200 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-400 animate-pulse shrink-0" />
              <span>Live Board</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Real-time status of active or recently dispatched trips.</p>
          </div>

          <div className="space-y-3.5">
            {trips
              .filter(t => t.status === 'Dispatched' || t.status === 'Completed')
              .slice(0, 5)
              .map((t) => (
                <div key={t.id} className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-lg flex flex-col space-y-2 hover:border-slate-800 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] text-slate-500 font-mono">#{t.id.substring(0, 8)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  
                  <div className="text-xs font-semibold text-slate-200">
                    {t.source} → {t.destination}
                  </div>
                  
                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    <div>Vehicle: <span className="text-slate-300">{t.vehicles?.name_model || 'N/A'} ({t.vehicles?.registration_number || 'N/A'})</span></div>
                    <div>Driver: <span className="text-slate-300">{t.drivers?.name || 'N/A'}</span></div>
                  </div>
                </div>
              ))}
            {trips.filter(t => t.status === 'Dispatched' || t.status === 'Completed').length === 0 && (
              <div className="text-center py-6 text-slate-550 text-xs">
                No active or completed dispatches at this time.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <Route className="h-5 w-5 text-blue-400" />
                <span>Create New Trip Draft</span>
              </h2>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Visual Lifecycle Stepper */}
            <div className="flex items-center justify-between mb-6 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
              {[
                { label: 'Draft', status: 'Draft' },
                { label: 'Dispatched', status: 'Dispatched' },
                { label: 'Completed', status: 'Completed' },
                { label: 'Cancelled', status: 'Cancelled' }
              ].map((step, idx) => {
                const isActive = step.status === 'Draft';
                return (
                  <React.Fragment key={step.status}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border transition-all ${
                        isActive 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30 scale-105' 
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-[10px] font-bold mt-1 transition-colors ${
                        isActive ? 'text-blue-400' : 'text-slate-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div className="h-px bg-slate-800 flex-1 mx-1 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Warehouse A"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Destination
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Retail Outlet B"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Assign Available Vehicle
                </label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => {
                    setSelectedVehicleId(e.target.value)
                    // Auto-fill planned capacity or limits checking later
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select a vehicle...</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name_model} ({v.registration_number}) - Cap: {v.max_load_capacity}kg, Odo: {v.odometer}km
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <span className="text-[10px] text-amber-500 block mt-1">No Available vehicles in fleet! Put In-Shop or On-Trip vehicles back to Available to select them.</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Assign Available Driver
                </label>
                <select
                  required
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select a driver...</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.license_number})
                    </option>
                  ))}
                </select>
                {availableDrivers.length === 0 && (
                  <span className="text-[10px] text-amber-500 block mt-1">No Available drivers! Ensure drivers are not Suspended, Off Duty, On Trip, or Expired.</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Cargo (kg)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="450"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Revenue ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="1500"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Overload Alert Box */}
              {isCargoOverloaded && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs mb-4 flex flex-col space-y-1 animate-in fade-in duration-200">
                  <span className="font-bold flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                    Dispatch Blocked: Load Capacity Exceeded
                  </span>
                  <span>
                    Vehicle Capacity: <strong>{maxCapacityVal} kg</strong> / Cargo Weight: <strong>{cargoWeightNum} kg</strong>
                  </span>
                  <span className="font-semibold text-red-300">
                    Capacity exceeded by {cargoExceededAmt} kg — dispatch blocked
                  </span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isCargoOverloaded}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20"
                >
                  {loading ? 'Creating...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {isCompleteOpen && activeTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>Complete Trip Details</span>
              </h2>
              <button 
                onClick={() => {
                  setIsCompleteOpen(false)
                  setActiveTrip(null)
                }}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/60 text-xs text-slate-400 space-y-1">
                <span className="block font-semibold text-slate-300">Assignment Reference</span>
                <div>Vehicle: <code className="text-blue-400">{activeTrip.vehicles?.name_model} ({activeTrip.vehicles?.registration_number})</code></div>
                <div>Starting Odometer: <strong className="text-slate-300">{activeTrip.vehicles?.odometer} km</strong></div>
                <div>Planned Distance: <strong className="text-slate-300">{activeTrip.planned_distance} km</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Final Odometer (km)
                </label>
                <input
                  type="number"
                  required
                  min={activeTrip.vehicles ? activeTrip.vehicles.odometer : 0}
                  value={finalOdometer}
                  onChange={(e) => setFinalOdometer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Must be equal or greater than starting odometer.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Fuel Consumed (Liters)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="25.5"
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Fuel Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="38.25"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompleteOpen(false)
                    setActiveTrip(null)
                  }}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/20"
                >
                  {loading ? 'Submitting...' : 'Complete Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
