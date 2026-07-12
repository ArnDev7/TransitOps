const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seed() {
  console.log('Logging in...');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'tester@transitops.com', password: 'Password123!'
  });
  if (authErr) {
    console.error('LOGIN FAILED:', authErr.message);
    return;
  }
  console.log('Logged in successfully!');

  // Clear tables in reverse dependency order
  console.log('Clearing old data...');
  await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('fuel_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('maintenance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Seeding Vehicles...');
  const { error: vErr } = await supabase.from('vehicles').insert([
    { id: 'aaaa0001-0000-0000-0000-000000000001', registration_number: 'MH-12-AB-1234', name_model: 'Tata Ace Gold',     type: 'Van',   max_load_capacity: 750,   odometer: 12450, acquisition_cost: 485000,  status: 'Available', region: 'Mumbai' },
    { id: 'aaaa0002-0000-0000-0000-000000000002', registration_number: 'KA-01-CD-5678', name_model: 'Ashok Leyland Dost', type: 'Truck', max_load_capacity: 1500,  odometer: 34200, acquisition_cost: 820000,  status: 'Available', region: 'Bangalore' },
    { id: 'aaaa0003-0000-0000-0000-000000000003', registration_number: 'DL-10-EF-9012', name_model: 'BharatBenz 1617R',   type: 'Semi',  max_load_capacity: 8000,  odometer: 87600, acquisition_cost: 2450000, status: 'Available', region: 'Delhi' },
    { id: 'aaaa0004-0000-0000-0000-000000000004', registration_number: 'TN-09-GH-3456', name_model: 'Mahindra Supro',     type: 'Van',   max_load_capacity: 600,   odometer: 5800,  acquisition_cost: 395000,  status: 'Available', region: 'Chennai' },
    { id: 'aaaa0005-0000-0000-0000-000000000005', registration_number: 'GJ-06-IJ-7890', name_model: 'Eicher Pro 3019',    type: 'Truck', max_load_capacity: 12000, odometer: 142300,acquisition_cost: 3100000, status: 'Retired',   region: 'Ahmedabad' },
    { id: 'aaaa0006-0000-0000-0000-000000000006', registration_number: 'RJ-14-KL-2345', name_model: 'Volvo FH16',         type: 'Semi',  max_load_capacity: 15000, odometer: 80,    acquisition_cost: 5200000, status: 'Available', region: 'Jaipur' }
  ]);
  if (vErr) { console.error('Vehicles insert failed:', vErr); return; }

  console.log('Seeding Drivers...');
  const { error: dErr } = await supabase.from('drivers').insert([
    { id: 'bbbb0001-0000-0000-0000-000000000001', name: 'Rajesh Kumar',   license_number: 'DL-MH-2023-00142', license_category: 'Class A', license_expiry_date: '2029-06-15', contact_number: '9876543210', safety_score: 92,  status: 'Available' },
    { id: 'bbbb0002-0000-0000-0000-000000000002', name: 'Priya Sharma',   license_number: 'DL-KA-2022-08831', license_category: 'Class B', license_expiry_date: '2028-11-30', contact_number: '9876543211', safety_score: 97,  status: 'Available' },
    { id: 'bbbb0003-0000-0000-0000-000000000003', name: 'Mohammed Irfan', license_number: 'DL-DL-2024-04455', license_category: 'Class A', license_expiry_date: '2030-03-20', contact_number: '9876543212', safety_score: 88,  status: 'Off Duty' },
    { id: 'bbbb0004-0000-0000-0000-000000000004', name: 'Suresh Patel',   license_number: 'DL-GJ-2021-11209', license_category: 'Class C', license_expiry_date: '2027-09-01', contact_number: '9876543213', safety_score: 45,  status: 'Suspended' },
    { id: 'bbbb0005-0000-0000-0000-000000000005', name: 'Anita Desai',    license_number: 'DL-TN-2019-06677', license_category: 'Class A', license_expiry_date: '2024-01-15', contact_number: '9876543214', safety_score: 78,  status: 'Available' },
    { id: 'bbbb0006-0000-0000-0000-000000000006', name: 'Vikram Singh',   license_number: 'DL-RJ-2023-03388', license_category: 'Class B', license_expiry_date: '2031-07-10', contact_number: '9876543215', safety_score: 95,  status: 'Available' }
  ]);
  if (dErr) { console.error('Drivers insert failed:', dErr); return; }

  // Trip 1 workflow
  console.log('Seeding Trip 1...');
  const { error: t1Err } = await supabase.from('trips').insert({
    id: 'cccc0001-0000-0000-0000-000000000001',
    source: 'Delhi Distribution Hub',
    destination: 'Jaipur Warehouse',
    vehicle_id: 'aaaa0003-0000-0000-0000-000000000003',
    driver_id: 'bbbb0001-0000-0000-0000-000000000001',
    cargo_weight: 6500,
    planned_distance: 280,
    revenue: 7500,
    status: 'Draft'
  });
  if (t1Err) { console.error('Trip 1 insert failed:', t1Err); return; }

  console.log('Dispatching Trip 1...');
  const { error: t1UpdErr } = await supabase.from('trips').update({ status: 'Dispatched' })
    .eq('id', 'cccc0001-0000-0000-0000-000000000001');
  if (t1UpdErr) { console.error('Trip 1 dispatch failed:', t1UpdErr); return; }

  // Trip 2 workflow
  console.log('Seeding Trip 2...');
  const { error: t2Err } = await supabase.from('trips').insert({
    id: 'cccc0002-0000-0000-0000-000000000002',
    source: 'Chennai Port Terminal',
    destination: 'Coimbatore Distribution Center',
    vehicle_id: 'aaaa0004-0000-0000-0000-000000000004',
    driver_id: 'bbbb0002-0000-0000-0000-000000000002',
    cargo_weight: 420,
    planned_distance: 510,
    revenue: 4200,
    status: 'Draft'
  });
  if (t2Err) { console.error('Trip 2 insert failed:', t2Err); return; }

  console.log('Dispatching Trip 2...');
  const { error: t2DispErr } = await supabase.from('trips').update({ status: 'Dispatched' })
    .eq('id', 'cccc0002-0000-0000-0000-000000000002');
  if (t2DispErr) { console.error('Trip 2 dispatch failed:', t2DispErr); return; }

  console.log('Completing Trip 2...');
  const { error: t2CompErr } = await supabase.from('trips').update({
    status: 'Completed',
    final_odometer: 6050,
    fuel_consumed: 14.5
  }).eq('id', 'cccc0002-0000-0000-0000-000000000002');
  if (t2CompErr) { console.error('Trip 2 completion failed:', t2CompErr); return; }

  // Trip 3 workflow
  console.log('Seeding Trip 3...');
  const { error: t3Err } = await supabase.from('trips').insert({
    id: 'cccc0003-0000-0000-0000-000000000003',
    source: 'Jaipur Cold Storage',
    destination: 'Udaipur Retail Depot',
    vehicle_id: 'aaaa0006-0000-0000-0000-000000000006',
    driver_id: 'bbbb0006-0000-0000-0000-000000000006',
    cargo_weight: 9800,
    planned_distance: 390,
    revenue: 6800,
    status: 'Draft'
  });
  if (t3Err) { console.error('Trip 3 insert failed:', t3Err); return; }

  console.log('Dispatching Trip 3...');
  const { error: t3DispErr } = await supabase.from('trips').update({ status: 'Dispatched' })
    .eq('id', 'cccc0003-0000-0000-0000-000000000003');
  if (t3DispErr) { console.error('Trip 3 dispatch failed:', t3DispErr); return; }

  console.log('Cancelling Trip 3...');
  const { error: t3CancelErr } = await supabase.from('trips').update({ status: 'Cancelled' })
    .eq('id', 'cccc0003-0000-0000-0000-000000000003');
  if (t3CancelErr) { console.error('Trip 3 cancel failed:', t3CancelErr); return; }

  // Maintenance workflow
  console.log('Seeding Maintenance logs...');
  const { error: m1Err } = await supabase.from('maintenance_logs').insert({
    id: 'dddd0001-0000-0000-0000-000000000001',
    vehicle_id: 'aaaa0001-0000-0000-0000-000000000001',
    description: 'Oil Change + Brake Pad Replacement',
    cost: 1500,
    is_active: true
  });
  if (m1Err) { console.error('Maint 1 insert failed:', m1Err); return; }

  const { error: m2Err } = await supabase.from('maintenance_logs').insert({
    id: 'dddd0002-0000-0000-0000-000000000002',
    vehicle_id: 'aaaa0002-0000-0000-0000-000000000002',
    description: 'Tire Rotation + Alignment',
    cost: 800,
    is_active: false,
    closed_at: '2026-06-28T10:00:00Z'
  });
  if (m2Err) { console.error('Maint 2 insert failed:', m2Err); return; }

  // Fuel logs
  console.log('Seeding Fuel logs...');
  const { error: fErr } = await supabase.from('fuel_logs').insert([
    { id: 'eeee0001-0000-0000-0000-000000000001', vehicle_id: 'aaaa0001-0000-0000-0000-000000000001', liters: 45.0,  cost: 4050,  date: '2026-07-01' },
    { id: 'eeee0002-0000-0000-0000-000000000002', vehicle_id: 'aaaa0002-0000-0000-0000-000000000002', liters: 68.5,  cost: 6165,  date: '2026-07-03' },
    { id: 'eeee0003-0000-0000-0000-000000000003', vehicle_id: 'aaaa0003-0000-0000-0000-000000000003', liters: 120.0, cost: 10800, date: '2026-07-05' },
    { id: 'eeee0004-0000-0000-0000-000000000004', vehicle_id: 'aaaa0004-0000-0000-0000-000000000004', liters: 32.0,  cost: 2880,  date: '2026-07-08' },
    { id: 'eeee0005-0000-0000-0000-000000000005', vehicle_id: 'aaaa0002-0000-0000-0000-000000000002', liters: 55.0,  cost: 4950,  date: '2026-07-10' }
  ]);
  if (fErr) { console.error('Fuel logs insert failed:', fErr); return; }

  // Expenses
  console.log('Seeding Expenses...');
  const { error: eErr } = await supabase.from('expenses').insert([
    { id: 'ffff0001-0000-0000-0000-000000000001', vehicle_id: 'aaaa0003-0000-0000-0000-000000000003', type: 'toll',  amount: 650,  date: '2026-07-05' },
    { id: 'ffff0002-0000-0000-0000-000000000002', vehicle_id: 'aaaa0003-0000-0000-0000-000000000003', type: 'other', amount: 1200, date: '2026-07-06' },
    { id: 'ffff0003-0000-0000-0000-000000000003', vehicle_id: 'aaaa0004-0000-0000-0000-000000000004', type: 'toll',  amount: 320,  date: '2026-07-08' },
    { id: 'ffff0004-0000-0000-0000-000000000004', vehicle_id: 'aaaa0002-0000-0000-0000-000000000002', type: 'toll',  amount: 480,  date: '2026-07-10' }
  ]);
  if (eErr) { console.error('Expenses insert failed:', eErr); return; }

  console.log('SEEDING COMPLETED SUCCESSFULLY!');
}

seed().catch(e => console.error(e));
