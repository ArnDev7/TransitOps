-- ============================================================
-- seed_data.sql — Run once in Supabase SQL Editor
-- Exercises triggers; do NOT wrap in a transaction.
-- ============================================================

-- ============================
-- Fixed UUIDs (for referencing)
-- ============================
-- Vehicles
--   v1  aaaa0001-...  Van,   Available  → will become In Shop (step 7)
--   v2  aaaa0002-...  Truck, Available  → stays Available
--   v3  aaaa0003-...  Semi,  Available  → trip 1 dispatch → On Trip
--   v4  aaaa0004-...  Van,   Available  → trip 2 full lifecycle → back to Available
--   v5  aaaa0005-...  Truck, Retired
--   v6  aaaa0006-...  Semi,  Available  → trip 3 cancel path → back to Available (near-zero odo)
--
-- Drivers
--   d1  bbbb0001-...  Available  → trip 1 dispatch → On Trip
--   d2  bbbb0002-...  Available  → trip 2 full lifecycle → back to Available
--   d3  bbbb0003-...  Off Duty
--   d4  bbbb0004-...  Suspended
--   d5  bbbb0005-...  Available but EXPIRED license (rule 3 test)
--   d6  bbbb0006-...  Available  → trip 3 cancel path → back to Available
--
-- Trips
--   t1  cccc0001-...  Draft → Dispatched (stays active)
--   t2  cccc0002-...  Draft → Dispatched → Completed
--   t3  cccc0003-...  Draft → Dispatched → Cancelled
--
-- Maintenance
--   m1  dddd0001-...  Active (cascades v1 to In Shop)
--   m2  dddd0002-...  Closed (history for v2)
--
-- Fuel Logs
--   f1-f5  eeee0001..0005
--
-- Expenses
--   x1-x4  ffff0001..0004

-- ============================================================
-- 1. VEHICLES (all inserted as Available; triggers will mutate)
-- ============================================================

INSERT INTO public.vehicles (id, registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status, region)
VALUES
  ('aaaa0001-0000-0000-0000-000000000001', 'MH-12-AB-1234', 'Tata Ace Gold',     'Van',   750,   12450, 485000,  'Available', 'Mumbai'),
  ('aaaa0002-0000-0000-0000-000000000002', 'KA-01-CD-5678', 'Ashok Leyland Dost', 'Truck', 1500,  34200, 820000,  'Available', 'Bangalore'),
  ('aaaa0003-0000-0000-0000-000000000003', 'DL-10-EF-9012', 'BharatBenz 1617R',   'Semi',  8000,  87600, 2450000, 'Available', 'Delhi'),
  ('aaaa0004-0000-0000-0000-000000000004', 'TN-09-GH-3456', 'Mahindra Supro',     'Van',   600,   5800,  395000,  'Available', 'Chennai'),
  ('aaaa0005-0000-0000-0000-000000000005', 'GJ-06-IJ-7890', 'Eicher Pro 3019',    'Truck', 12000, 142300,3100000, 'Retired',   'Ahmedabad'),
  ('aaaa0006-0000-0000-0000-000000000006', 'RJ-14-KL-2345', 'Volvo FH16',         'Semi',  15000, 80,    5200000, 'Available', 'Jaipur');

-- ============================================================
-- 2. DRIVERS (all inserted directly with their base status)
-- ============================================================

INSERT INTO public.drivers (id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
VALUES
  ('bbbb0001-0000-0000-0000-000000000001', 'Rajesh Kumar',   'DL-MH-2023-00142', 'Class A', '2029-06-15', '9876543210', 92,  'Available'),
  ('bbbb0002-0000-0000-0000-000000000002', 'Priya Sharma',   'DL-KA-2022-08831', 'Class B', '2028-11-30', '9876543211', 97,  'Available'),
  ('bbbb0003-0000-0000-0000-000000000003', 'Mohammed Irfan', 'DL-DL-2024-04455', 'Class A', '2030-03-20', '9876543212', 88,  'Off Duty'),
  ('bbbb0004-0000-0000-0000-000000000004', 'Suresh Patel',   'DL-GJ-2021-11209', 'Class C', '2027-09-01', '9876543213', 45,  'Suspended'),
  ('bbbb0005-0000-0000-0000-000000000005', 'Anita Desai',    'DL-TN-2019-06677', 'Class A', '2024-01-15', '9876543214', 78,  'Available'),
  ('bbbb0006-0000-0000-0000-000000000006', 'Vikram Singh',   'DL-RJ-2023-03388', 'Class B', '2031-07-10', '9876543215', 95,  'Available');

-- ============================================================
-- 3. TRIP 1 — Active dispatch (stays in Dispatched)
--    Vehicle: v3 (DL-10-EF-9012, Semi), Driver: d1 (Rajesh Kumar)
--    Both should cascade to On Trip
-- ============================================================

-- 3a. Insert as Draft
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status)
VALUES (
  'cccc0001-0000-0000-0000-000000000001',
  'Delhi Distribution Hub',
  'Jaipur Warehouse',
  'aaaa0003-0000-0000-0000-000000000003',
  'bbbb0001-0000-0000-0000-000000000001',
  6500,
  280,
  7500,
  'Draft'
);

-- 3b. Dispatch it → trigger cascades v3 + d1 to On Trip
UPDATE public.trips SET status = 'Dispatched'
WHERE id = 'cccc0001-0000-0000-0000-000000000001';

-- ============================================================
-- 4. TRIP 2 — Full lifecycle (Draft → Dispatched → Completed)
--    Vehicle: v4 (TN-09-GH-3456, Van, odo=5800), Driver: d2 (Priya Sharma)
-- ============================================================

-- 4a. Insert as Draft
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status)
VALUES (
  'cccc0002-0000-0000-0000-000000000002',
  'Chennai Port Terminal',
  'Coimbatore Distribution Center',
  'aaaa0004-0000-0000-0000-000000000004',
  'bbbb0002-0000-0000-0000-000000000002',
  420,
  510,
  4200,
  'Draft'
);

-- 4b. Dispatch → v4 + d2 become On Trip
UPDATE public.trips SET status = 'Dispatched'
WHERE id = 'cccc0002-0000-0000-0000-000000000002';

-- 4c. Complete → v4 + d2 return to Available, v4 odometer → 6050
UPDATE public.trips
SET status = 'Completed',
    final_odometer = 6050,
    fuel_consumed = 14.5
WHERE id = 'cccc0002-0000-0000-0000-000000000002';

-- ============================================================
-- 5. TRIP 3 — Cancel path (Draft → Dispatched → Cancelled)
--    Vehicle: v6 (RJ-14-KL-2345, Semi, odo=80), Driver: d6 (Vikram Singh)
-- ============================================================

-- 5a. Insert as Draft
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status)
VALUES (
  'cccc0003-0000-0000-0000-000000000003',
  'Jaipur Cold Storage',
  'Udaipur Retail Depot',
  'aaaa0006-0000-0000-0000-000000000006',
  'bbbb0006-0000-0000-0000-000000000006',
  9800,
  390,
  6800,
  'Draft'
);

-- 5b. Dispatch → v6 + d6 become On Trip
UPDATE public.trips SET status = 'Dispatched'
WHERE id = 'cccc0003-0000-0000-0000-000000000003';

-- 5c. Cancel → v6 + d6 return to Available
UPDATE public.trips SET status = 'Cancelled'
WHERE id = 'cccc0003-0000-0000-0000-000000000003';

-- ============================================================
-- 6. MAINTENANCE — Active log (cascades v1 to In Shop)
-- ============================================================

INSERT INTO public.maintenance_logs (id, vehicle_id, description, cost, is_active)
VALUES (
  'dddd0001-0000-0000-0000-000000000001',
  'aaaa0001-0000-0000-0000-000000000001',
  'Oil Change + Brake Pad Replacement',
  1500,
  true
);

-- ============================================================
-- 7. MAINTENANCE — Closed log (history for v2, no status impact)
-- ============================================================

INSERT INTO public.maintenance_logs (id, vehicle_id, description, cost, is_active, closed_at)
VALUES (
  'dddd0002-0000-0000-0000-000000000002',
  'aaaa0002-0000-0000-0000-000000000002',
  'Tire Rotation + Alignment',
  800,
  false,
  '2026-06-28T10:00:00Z'
);

-- ============================================================
-- 8. FUEL LOGS (5 rows across 3 vehicles)
-- ============================================================

INSERT INTO public.fuel_logs (id, vehicle_id, liters, cost, date)
VALUES
  ('eeee0001-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 45.0,  4050,  '2026-07-01'),
  ('eeee0002-0000-0000-0000-000000000002', 'aaaa0002-0000-0000-0000-000000000002', 68.5,  6165,  '2026-07-03'),
  ('eeee0003-0000-0000-0000-000000000003', 'aaaa0003-0000-0000-0000-000000000003', 120.0, 10800, '2026-07-05'),
  ('eeee0004-0000-0000-0000-000000000004', 'aaaa0004-0000-0000-0000-000000000004', 32.0,  2880,  '2026-07-08'),
  ('eeee0005-0000-0000-0000-000000000005', 'aaaa0002-0000-0000-0000-000000000002', 55.0,  4950,  '2026-07-10');

-- ============================================================
-- 9. EXPENSES (4 rows across 2 vehicles, mix of toll/other)
-- ============================================================

INSERT INTO public.expenses (id, vehicle_id, type, amount, date)
VALUES
  ('ffff0001-0000-0000-0000-000000000001', 'aaaa0003-0000-0000-0000-000000000003', 'toll',  650,  '2026-07-05'),
  ('ffff0002-0000-0000-0000-000000000002', 'aaaa0003-0000-0000-0000-000000000003', 'other', 1200, '2026-07-06'),
  ('ffff0003-0000-0000-0000-000000000003', 'aaaa0004-0000-0000-0000-000000000004', 'toll',  320,  '2026-07-08'),
  ('ffff0004-0000-0000-0000-000000000004', 'aaaa0002-0000-0000-0000-000000000002', 'toll',  480,  '2026-07-10');

-- ============================================================
-- 10. DIAGNOSTIC — Verify cascade results
-- ============================================================

SELECT '--- VEHICLE STATUS ---' AS section;

SELECT registration_number, name_model, type, status, odometer, region
FROM public.vehicles
ORDER BY registration_number;

-- Expected:
--   DL-10-EF-9012  → On Trip   (trip 1 dispatched, still active)
--   GJ-06-IJ-7890  → Retired   (inserted as Retired)
--   KA-01-CD-5678  → Available (closed maintenance, no effect)
--   MH-12-AB-1234  → In Shop   (active maintenance from step 6)
--   RJ-14-KL-2345  → Available (trip 3 cancelled, restored)
--   TN-09-GH-3456  → Available (trip 2 completed, odometer=6050)

SELECT '--- DRIVER STATUS ---' AS section;

SELECT name, license_number, license_expiry_date, status, safety_score
FROM public.drivers
ORDER BY name;

-- Expected:
--   Anita Desai     → Available (but license expired 2024-01-15 — rule 3 trap)
--   Mohammed Irfan  → Off Duty  (inserted directly)
--   Priya Sharma    → Available (trip 2 completed, restored)
--   Rajesh Kumar    → On Trip   (trip 1 dispatched, still active)
--   Suresh Patel    → Suspended (inserted directly)
--   Vikram Singh    → Available (trip 3 cancelled, restored)

SELECT '--- TRIP STATUS ---' AS section;

SELECT id, source, destination, status, final_odometer, fuel_consumed, revenue
FROM public.trips
ORDER BY created_at;

-- Expected:
--   cccc0001  Delhi→Jaipur     Dispatched  NULL   NULL    7500
--   cccc0002  Chennai→Coimbat  Completed   6050   14.5    4200
--   cccc0003  Jaipur→Udaipur   Cancelled   NULL   NULL    6800
