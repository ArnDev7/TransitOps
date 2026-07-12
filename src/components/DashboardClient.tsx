'use client'

import React, { useState } from 'react'
import { 
  Car, 
  Users, 
  Route, 
  Wrench, 
  Percent, 
  ShieldCheck, 
  MapPin, 
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Vehicle {
  id: string
  registration_number: string
  name_model: string
  type: string
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired'
  region: string
}

interface Driver {
  id: string
  name: string
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'
}

interface Trip {
  id: string
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled'
  vehicle_id: string
  driver_id: string
  source: string
  destination: string
  cargo_weight: number
  vehicles?: { registration_number: string; name_model: string } | null
  drivers?: { name: string } | null
}

interface DashboardClientProps {
  vehicles: Vehicle[]
  drivers: Driver[]
  trips: Trip[]
}

export default function DashboardClient({ vehicles, drivers, trips }: DashboardClientProps) {
  // Filters state
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [regionFilter, setRegionFilter] = useState('All')

  // Get unique lists for filter dropdowns
  const vehicleTypes = ['All', ...Array.from(new Set(vehicles.map(v => v.type)))]
  const statuses = ['All', 'Available', 'On Trip', 'In Shop', 'Retired']
  const regions = ['All', ...Array.from(new Set(vehicles.map(v => v.region)))]

  // Apply filters to vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesType = typeFilter === 'All' || v.type === typeFilter
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter
    const matchesRegion = regionFilter === 'All' || v.region === regionFilter
    return matchesType && matchesStatus && matchesRegion
  })

  // Get the IDs of the filtered vehicles
  const filteredVehicleIds = new Set(filteredVehicles.map(v => v.id))

  // Apply filters to trips (filter trips associated with the filtered vehicles)
  const filteredTrips = trips.filter(t => filteredVehicleIds.has(t.vehicle_id))

  // Compute KPIs based on filtered vehicles
  const activeVehiclesCount = filteredVehicles.filter(v => v.status === 'On Trip').length
  const availableVehiclesCount = filteredVehicles.filter(v => v.status === 'Available').length
  const maintenanceVehiclesCount = filteredVehicles.filter(v => v.status === 'In Shop').length
  
  const activeTripsCount = filteredTrips.filter(t => t.status === 'Dispatched').length
  const pendingTripsCount = filteredTrips.filter(t => t.status === 'Draft').length

  const nonRetiredVehiclesCount = filteredVehicles.filter(v => v.status !== 'Retired').length
  const utilizationRate = nonRetiredVehiclesCount > 0 
    ? Math.round((activeVehiclesCount / nonRetiredVehiclesCount) * 100) 
    : 0

  // Drivers on duty (Available or On Trip drivers)
  const driversOnDutyCount = drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length

  const kpis = [
    { 
      name: 'Active Vehicles', 
      value: activeVehiclesCount, 
      desc: 'Currently on the road', 
      icon: Car, 
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' 
    },
    { 
      name: 'Available Vehicles', 
      value: availableVehiclesCount, 
      desc: 'Ready for assignment', 
      icon: CheckCircle2, 
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
    },
    { 
      name: 'In Maintenance', 
      value: maintenanceVehiclesCount, 
      desc: 'Currently in workshop', 
      icon: Wrench, 
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
    },
    { 
      name: 'Active Trips', 
      value: activeTripsCount, 
      desc: 'Dispatched assignments', 
      icon: Route, 
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
    },
    { 
      name: 'Pending Trips', 
      value: pendingTripsCount, 
      desc: 'Trips in draft status', 
      icon: ClockIcon, 
      color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' 
    },
    { 
      name: 'Drivers On Duty', 
      value: driversOnDutyCount, 
      desc: 'Available + On Trip drivers', 
      icon: Users, 
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' 
    },
    { 
      name: 'Fleet Utilization', 
      value: `${utilizationRate}%`, 
      desc: 'On Trip / non-retired vehicles', 
      icon: Percent, 
      color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' 
    },
  ]

  // Active Dispatch logs
  const activeDispatches = trips.filter(t => t.status === 'Dispatched').slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time metrics, fleet utilization, and active trip dispatch trackers.</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Vehicle Type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center">
            <Car className="h-3 w-3 mr-1 text-slate-400" />
            <span>Vehicle Type</span>
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {vehicleTypes.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
            ))}
          </select>
        </div>

        {/* Vehicle Status */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center">
            <Filter className="h-3 w-3 mr-1 text-slate-400" />
            <span>Vehicle Status</span>
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center">
            <MapPin className="h-3 w-3 mr-1 text-slate-400" />
            <span>Operating Region</span>
          </label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {regions.map(r => (
              <option key={r} value={r}>{r === 'All' ? 'All Regions' : r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div 
            key={idx}
            className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 flex items-center space-x-4 shadow-lg hover:border-slate-800 transition-all"
          >
            <div className={`p-3 rounded-lg border ${kpi.color}`}>
              <kpi.icon className="h-6 w-6 shrink-0" />
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wider block font-semibold">{kpi.name}</span>
              <span className="text-2xl font-extrabold text-slate-100 block mt-0.5">{kpi.value}</span>
              <span className="text-slate-400 text-[10px] mt-0.5 block">{kpi.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Trips Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Live Dispatches */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-850">
            <h2 className="font-bold text-lg text-slate-200 flex items-center space-x-2">
              <Route className="h-5 w-5 text-blue-400" />
              <span>Live Dispatched Monitor</span>
            </h2>
            <Link 
              href="/trips" 
              className="text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center space-x-1"
            >
              <span>View all dispatches</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {activeDispatches.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center py-8 text-slate-500">
              <Route className="h-10 w-10 text-slate-750 mb-2" />
              <p className="text-sm">No vehicles currently on active trips.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {activeDispatches.map((trip) => (
                <div 
                  key={trip.id} 
                  className="bg-slate-950/40 border border-slate-850/80 hover:border-slate-800 p-3.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-200">{trip.source}</span>
                      <ArrowRight className="h-3 w-3 text-slate-500" />
                      <span className="text-xs font-bold text-slate-200">{trip.destination}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Vehicle: <strong className="text-slate-300">{trip.vehicles?.name_model} ({trip.vehicles?.registration_number})</strong> | Driver: <strong className="text-slate-300">{trip.drivers?.name}</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs font-mono text-slate-500">Weight: {trip.cargo_weight} kg</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      On Trip
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Fleet Shop Alerts */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-850">
            <h2 className="font-bold text-lg text-slate-200 flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-amber-400" />
              <span>Workshop / In Shop Alerts</span>
            </h2>
            <Link 
              href="/maintenance" 
              className="text-amber-400 hover:text-amber-300 text-xs font-semibold"
            >
              <span>Manage Logs</span>
            </Link>
          </div>

          {filteredVehicles.filter(v => v.status === 'In Shop').length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center py-8 text-slate-500">
              <ShieldCheck className="h-10 w-10 text-slate-750 mb-2" />
              <p className="text-sm">All vehicles healthy and available.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1">
              {filteredVehicles.filter(v => v.status === 'In Shop').map((vehicle) => (
                <div 
                  key={vehicle.id} 
                  className="bg-slate-950/40 border border-slate-850/80 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{vehicle.name_model}</span>
                    <code className="text-[10px] text-blue-400 block font-mono">{vehicle.registration_number}</code>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Repairing
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
