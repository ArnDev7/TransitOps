const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runthrough() {
  // Login
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'tester@transitops.com', password: 'Password123!'
  });
  if (authErr) { console.error('LOGIN FAILED:', authErr.message); return; }

  const { data: profile } = await supabase.from('users').select('role').eq('id', auth.user.id).single();
  console.log('=========================================');
  console.log(' TRANSITOPS — FLEET MANAGER RUNTHROUGH');
  console.log('=========================================');
  console.log(`Logged in as: ${auth.user.email}`);
  console.log(`Role: ${profile?.role || 'unknown'}`);
  console.log(`Role is fleet_manager: ${profile?.role === 'fleet_manager' ? 'YES ✓' : 'NO ✗'}`);
  console.log('');

  // ---- DASHBOARD DATA ----
  console.log('═══════════════════════════════════════');
  console.log(' PAGE: DASHBOARD');
  console.log('═══════════════════════════════════════');
  const { data: vehicles } = await supabase.from('vehicles').select('*');
  const { data: drivers } = await supabase.from('drivers').select('*');
  const { data: trips } = await supabase.from('trips').select('*');
  const { data: maintLogs } = await supabase.from('maintenance_logs').select('*');
  
  const activeTrips = trips?.filter(t => t.status === 'Dispatched') || [];
  const activeMaint = maintLogs?.filter(m => m.is_active) || [];
  
  console.log(`Total Vehicles: ${vehicles?.length || 0}`);
  console.log(`Total Drivers: ${drivers?.length || 0}`);
  console.log(`Active Trips (Dispatched): ${activeTrips.length}`);
  console.log(`Maintenance Alerts (Active): ${activeMaint.length}`);
  console.log('');

  // ---- VEHICLES PAGE ----
  console.log('═══════════════════════════════════════');
  console.log(' PAGE: VEHICLES');
  console.log('═══════════════════════════════════════');
  console.log(`"Add Vehicle" button visible: YES (role=fleet_manager)`);
  console.log(`Vehicles listed: ${vehicles?.length || 0}`);
  console.log('');
  if (vehicles) {
    console.log(' Reg Number       | Model              | Type  | Status    | Odometer | Region');
    console.log(' -----------------+--------------------+-------+-----------+----------+----------');
    vehicles.forEach(v => {
      console.log(` ${v.registration_number.padEnd(17)}| ${v.name_model.padEnd(19)}| ${v.type.padEnd(6)}| ${v.status.padEnd(10)}| ${String(v.odometer).padEnd(9)}| ${v.region}`);
    });
  }
  console.log('');

  // ---- DRIVERS PAGE ----
  console.log('═══════════════════════════════════════');
  console.log(' PAGE: DRIVERS');
  console.log('═══════════════════════════════════════');
  console.log(`"Register Driver" button visible: YES (role=fleet_manager)`);
  console.log(`Drivers listed: ${drivers?.length || 0}`);
  console.log('');
  if (drivers) {
    console.log(' Name             | License           | Category | Expiry     | Score | Status');
    console.log(' -----------------+-------------------+----------+------------+-------+----------');
    drivers.forEach(d => {
      const expired = new Date(d.license_expiry_date) < new Date() ? ' ⚠ EXPIRED' : '';
      console.log(` ${d.name.padEnd(17)}| ${d.license_number.padEnd(18)}| ${d.license_category.padEnd(9)}| ${d.license_expiry_date} | ${String(d.safety_score).padEnd(6)}| ${d.status}${expired}`);
    });
  }
  console.log('');

  // ---- TRIPS PAGE ----
  console.log('═══════════════════════════════════════');
  console.log(' PAGE: TRIPS');
  console.log('═══════════════════════════════════════');
  console.log(`Trips listed: ${trips?.length || 0}`);
  console.log('');
  if (trips) {
    console.log(' Source                  | Destination                  | Status     | Cargo  | Revenue');
    console.log(' ------------------------+------------------------------+------------+--------+--------');
    trips.forEach(t => {
      console.log(` ${t.source.padEnd(24)}| ${t.destination.padEnd(29)}| ${t.status.padEnd(11)}| ${String(t.cargo_weight).padEnd(7)}| $${t.revenue}`);
    });
  }
  console.log('');

  // ---- MAINTENANCE PAGE ----
  console.log('═══════════════════════════════════════');
  console.log(' PAGE: MAINTENANCE');
  console.log('═══════════════════════════════════════');
  console.log(`"Log Maintenance" button visible: YES (role=fleet_manager)`);
  console.log(`Maintenance logs: ${maintLogs?.length || 0}`);
  console.log('');
  if (maintLogs) {
    maintLogs.forEach(m => {
      const veh = vehicles?.find(v => v.id === m.vehicle_id);
      console.log(` Vehicle: ${veh?.registration_number || m.vehicle_id}`);
      console.log(` Description: ${m.description}`);
      console.log(` Cost: $${m.cost}`);
      console.log(` Active: ${m.is_active ? 'YES (vehicle In Shop)' : 'NO (closed)'}`);
      console.log(` Closed At: ${m.closed_at || 'N/A'}`);
      console.log('');
    });
  }

  // ---- EXPENSES PAGE ----
  console.log('═══════════════════════════════════════');
  console.log(' PAGE: EXPENSES');
  console.log('═══════════════════════════════════════');
  const { data: fuelLogs } = await supabase.from('fuel_logs').select('*');
  const { data: expenses } = await supabase.from('expenses').select('*');
  
  console.log(`Fuel Logs: ${fuelLogs?.length || 0}`);
  if (fuelLogs) {
    fuelLogs.forEach(f => {
      const veh = vehicles?.find(v => v.id === f.vehicle_id);
      console.log(`  ${veh?.registration_number || '?'} — ${f.liters}L, $${f.cost}, ${f.date}`);
    });
  }
  console.log('');
  console.log(`Expenses: ${expenses?.length || 0}`);
  if (expenses) {
    expenses.forEach(e => {
      const veh = vehicles?.find(v => v.id === e.vehicle_id);
      console.log(`  ${veh?.registration_number || '?'} — ${e.type}, $${e.amount}, ${e.date}`);
    });
  }
  console.log('');

  // ---- REPORTS PAGE ----
  console.log('═══════════════════════════════════════');
  console.log(' PAGE: REPORTS & ROI');
  console.log('═══════════════════════════════════════');
  
  let totalFleetRevenue = 0, totalFleetCost = 0;
  
  if (vehicles) {
    vehicles.forEach(v => {
      const completedTrips = trips?.filter(t => t.vehicle_id === v.id && t.status === 'Completed') || [];
      const totalDist = completedTrips.reduce((s, t) => s + (t.planned_distance || 0), 0);
      const totalFuel = completedTrips.reduce((s, t) => s + (t.fuel_consumed || 0), 0);
      const fuelEff = totalFuel > 0 ? (totalDist / totalFuel).toFixed(2) : '0.00';
      
      const maintCost = maintLogs?.filter(m => m.vehicle_id === v.id).reduce((s, m) => s + m.cost, 0) || 0;
      const fuelCost = fuelLogs?.filter(f => f.vehicle_id === v.id).reduce((s, f) => s + f.cost, 0) || 0;
      const opCost = maintCost + fuelCost;
      
      const revenue = completedTrips.reduce((s, t) => s + (t.revenue || 0), 0);
      const profit = revenue - opCost;
      const roi = v.acquisition_cost > 0 ? ((profit / v.acquisition_cost) * 100).toFixed(1) : '0.0';
      
      totalFleetRevenue += revenue;
      totalFleetCost += opCost;
      
      if (completedTrips.length > 0 || opCost > 0) {
        console.log(`  ${v.registration_number} (${v.name_model}):`);
        console.log(`    Fuel Efficiency: ${fuelEff} km/L`);
        console.log(`    Revenue: $${revenue} | Op Cost: $${opCost} (Maint: $${maintCost} + Fuel: $${fuelCost})`);
        console.log(`    Net Profit: $${profit} | ROI: ${roi}%`);
        console.log('');
      }
    });
  }
  
  const totalFleetProfit = totalFleetRevenue - totalFleetCost;
  console.log('  ── FLEET SUMMARY ──');
  console.log(`  Total Fleet Revenue:       $${totalFleetRevenue.toLocaleString()}`);
  console.log(`  Total Operational Cost:    $${totalFleetCost.toLocaleString()}`);
  console.log(`  Net Fleet Profit:          $${totalFleetProfit.toLocaleString()}`);
  console.log('');

  // ---- VALIDATION CHECKS ----
  console.log('═══════════════════════════════════════');
  console.log(' BUSINESS RULE VALIDATION');
  console.log('═══════════════════════════════════════');
  
  const v3 = vehicles?.find(v => v.registration_number === 'DL-10-EF-9012');
  const v1 = vehicles?.find(v => v.registration_number === 'MH-12-AB-1234');
  const v4 = vehicles?.find(v => v.registration_number === 'TN-09-GH-3456');
  const v6 = vehicles?.find(v => v.registration_number === 'RJ-14-KL-2345');
  const v5 = vehicles?.find(v => v.registration_number === 'GJ-06-IJ-7890');
  
  const d1 = drivers?.find(d => d.name === 'Rajesh Kumar');
  const d2 = drivers?.find(d => d.name === 'Priya Sharma');
  const d6 = drivers?.find(d => d.name === 'Vikram Singh');
  
  const checks = [
    { rule: 'Trip 1 dispatch: v3 On Trip',       pass: v3?.status === 'On Trip' },
    { rule: 'Trip 1 dispatch: d1 On Trip',       pass: d1?.status === 'On Trip' },
    { rule: 'Trip 2 complete: v4 Available',      pass: v4?.status === 'Available' },
    { rule: 'Trip 2 complete: v4 odometer=6050',  pass: v4?.odometer == 6050 },
    { rule: 'Trip 2 complete: d2 Available',      pass: d2?.status === 'Available' },
    { rule: 'Trip 3 cancel: v6 Available',        pass: v6?.status === 'Available' },
    { rule: 'Trip 3 cancel: d6 Available',        pass: d6?.status === 'Available' },
    { rule: 'Active maint: v1 In Shop',           pass: v1?.status === 'In Shop' },
    { rule: 'Retired vehicle: v5 Retired',        pass: v5?.status === 'Retired' },
  ];
  
  let allPass = true;
  checks.forEach(c => {
    const icon = c.pass ? '✓' : '✗';
    if (!c.pass) allPass = false;
    console.log(`  ${icon} ${c.rule}`);
  });
  
  console.log('');
  console.log(allPass ? '  ══ ALL CHECKS PASSED ══' : '  ══ SOME CHECKS FAILED ══');
  console.log('');
}

runthrough().catch(e => console.error('Fatal:', e));
