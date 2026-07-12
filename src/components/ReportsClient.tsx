'use client'

import React, { useState } from 'react'
import { 
  BarChart3, 
  Download, 
  Car, 
  Scale, 
  Gauge, 
  Droplet, 
  DollarSign, 
  TrendingUp,
  FileText,
  Coins,
  Search
} from 'lucide-react'

interface Vehicle {
  id: string
  registration_number: string
  name_model: string
  acquisition_cost: number
  type: string
}

interface MaintenanceLog {
  vehicle_id: string
  cost: number
}

interface FuelLog {
  vehicle_id: string
  liters: number
  cost: number
}

interface Trip {
  vehicle_id: string
  status: string
  planned_distance: number
  fuel_consumed: number | null
  revenue: number
}

interface ReportsClientProps {
  vehicles: Vehicle[]
  maintenanceLogs: MaintenanceLog[]
  fuelLogs: FuelLog[]
  trips: Trip[]
}

export default function ReportsClient({ vehicles, maintenanceLogs, fuelLogs, trips }: ReportsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Compute metrics per vehicle
  const reportData = vehicles.map((vehicle) => {
    // 1. Odometer distance & fuel efficiency from completed trips
    const vehicleCompletedTrips = trips.filter(t => t.vehicle_id === vehicle.id && t.status === 'Completed')
    const totalDistance = vehicleCompletedTrips.reduce((sum, t) => sum + t.planned_distance, 0)
    const totalFuelConsumed = vehicleCompletedTrips.reduce((sum, t) => sum + (t.fuel_consumed || 0), 0)
    
    const fuelEfficiency = totalFuelConsumed > 0 
      ? (totalDistance / totalFuelConsumed).toFixed(2) 
      : '0.00'

    // 2. Operational Costs
    const vehicleMaintenanceCost = maintenanceLogs
      .filter(l => l.vehicle_id === vehicle.id)
      .reduce((sum, l) => sum + l.cost, 0)

    const vehicleFuelCost = fuelLogs
      .filter(l => l.vehicle_id === vehicle.id)
      .reduce((sum, l) => sum + l.cost, 0)

    const totalOperationalCost = vehicleMaintenanceCost + vehicleFuelCost

    // 3. ROI
    // Sum revenue of all completed trips
    const totalRevenue = vehicleCompletedTrips.reduce((sum, t) => sum + t.revenue, 0)
    
    const netProfit = totalRevenue - totalOperationalCost
    const roiPercentage = vehicle.acquisition_cost > 0
      ? ((netProfit / vehicle.acquisition_cost) * 100).toFixed(1)
      : '0.0'

    return {
      ...vehicle,
      totalDistance,
      totalFuelConsumed,
      fuelEfficiency,
      vehicleMaintenanceCost,
      vehicleFuelCost,
      totalOperationalCost,
      totalRevenue,
      netProfit,
      roiPercentage
    }
  })

  // Filter report data
  const filteredReport = reportData.filter(item => 
    item.name_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Registration Number',
      'Model',
      'Type',
      'Acquisition Cost ($)',
      'Total Distance (km)',
      'Fuel Consumed (L)',
      'Fuel Efficiency (km/L)',
      'Maintenance Cost ($)',
      'Fuel Cost ($)',
      'Total Operational Cost ($)',
      'Total Revenue ($)',
      'Net Profit ($)',
      'ROI (%)'
    ]

    const rows = filteredReport.map(item => [
      item.registration_number,
      item.name_model,
      item.type,
      item.acquisition_cost,
      item.totalDistance,
      item.totalFuelConsumed,
      item.fuelEfficiency,
      item.vehicleMaintenanceCost,
      item.vehicleFuelCost,
      item.totalOperationalCost,
      item.totalRevenue,
      item.netProfit,
      item.roiPercentage
    ])

    const csvContent = 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `TransitOps_Fleet_Report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // General Summary totals
  const totalFleetCost = reportData.reduce((sum, item) => sum + item.totalOperationalCost, 0)
  const totalFleetRevenue = reportData.reduce((sum, item) => sum + item.totalRevenue, 0)
  const totalFleetProfit = totalFleetRevenue - totalFleetCost

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & ROI</h1>
          <p className="text-slate-400 text-sm mt-1">Audit fleet profitability, fuel efficiency, and ROI analysis.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center space-x-2 transition-all text-sm shadow-lg shadow-blue-900/20"
        >
          <Download className="h-4.5 w-4.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs uppercase tracking-wider block font-semibold">Total Fleet Revenue</span>
            <span className="text-xl font-bold text-slate-100 block mt-0.5">${totalFleetRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs uppercase tracking-wider block font-semibold">Total Operational Cost</span>
            <span className="text-xl font-bold text-slate-100 block mt-0.5">${totalFleetCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs uppercase tracking-wider block font-semibold">Net Fleet Profit</span>
            <span className="text-xl font-bold text-slate-100 block mt-0.5">${totalFleetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by vehicle registration or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Reports Table */}
      {filteredReport.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <BarChart3 className="h-12 w-12 mx-auto text-slate-700 mb-3" />
          <p>No vehicle metrics available.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-850 bg-slate-900/20 rounded-xl shadow-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4 text-right">Distance (km)</th>
                <th className="py-3.5 px-4 text-right">Fuel efficiency</th>
                <th className="py-3.5 px-4 text-right">Maintenance Cost</th>
                <th className="py-3.5 px-4 text-right">Fuel Cost</th>
                <th className="py-3.5 px-4 text-right">Total Ops Cost</th>
                <th className="py-3.5 px-4 text-right">Acquisition</th>
                <th className="py-3.5 px-4 text-right">Revenue</th>
                <th className="py-3.5 px-4 text-right">ROI %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-350">
              {filteredReport.map((item) => {
                const isPositiveRoi = parseFloat(item.roiPercentage) >= 0
                return (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-200 block">{item.name_model}</span>
                      <code className="text-xs text-blue-400 font-mono tracking-wider">{item.registration_number}</code>
                    </td>
                    <td className="py-3.5 px-4 text-right">{item.totalDistance.toLocaleString()} km</td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                      <span className="flex items-center justify-end">
                        <Droplet className="h-3.5 w-3.5 mr-1 text-blue-400" />
                        {item.fuelEfficiency} km/L
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">${item.vehicleMaintenanceCost.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right">${item.vehicleFuelCost.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-350">${item.totalOperationalCost.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right">${item.acquisition_cost.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-blue-400">${item.totalRevenue.toLocaleString()}</td>
                    <td className={`py-3.5 px-4 text-right font-bold ${
                      isPositiveRoi ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {isPositiveRoi ? '+' : ''}{item.roiPercentage}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
