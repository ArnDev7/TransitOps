-- ----------------------------------------------------
-- 1. Create Enums / Clean Tables
-- ----------------------------------------------------

-- Clean up existing triggers and functions if they exist
DROP TRIGGER IF EXISTS trips_status_cascade_trigger ON public.trips;
DROP FUNCTION IF EXISTS public.handle_trip_status_change();
DROP TRIGGER IF EXISTS maintenance_logs_status_cascade_trigger ON public.maintenance_logs;
DROP FUNCTION IF EXISTS public.handle_maintenance_log_change();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create Tables

-- users table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('fleet_manager', 'driver', 'safety_officer', 'financial_analyst')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text UNIQUE NOT NULL,
  name_model text NOT NULL,
  type text NOT NULL, -- e.g., 'Van', 'Truck', 'Semi', etc.
  max_load_capacity numeric NOT NULL CHECK (max_load_capacity > 0),
  odometer numeric NOT NULL DEFAULT 0 CHECK (odometer >= 0),
  acquisition_cost numeric NOT NULL DEFAULT 0 CHECK (acquisition_cost >= 0),
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'In Shop', 'Retired')),
  region text NOT NULL DEFAULT 'Global',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  license_number text UNIQUE NOT NULL,
  license_category text NOT NULL,
  license_expiry_date date NOT NULL,
  contact_number text,
  safety_score numeric DEFAULT 100 CHECK (safety_score >= 0 AND safety_score <= 100),
  status text NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  destination text NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  cargo_weight numeric NOT NULL CHECK (cargo_weight > 0),
  planned_distance numeric NOT NULL CHECK (planned_distance > 0),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')),
  final_odometer numeric CHECK (final_odometer >= 0),
  fuel_consumed numeric CHECK (fuel_consumed >= 0),
  revenue numeric NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  dispatched_at timestamptz,
  completed_at timestamptz
);

-- maintenance_logs table
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  description text NOT NULL,
  cost numeric NOT NULL DEFAULT 0 CHECK (cost >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  closed_at timestamptz
);

-- fuel_logs table
CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  liters numeric NOT NULL CHECK (liters > 0),
  cost numeric NOT NULL CHECK (cost >= 0),
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('toll', 'other')),
  amount numeric NOT NULL CHECK (amount >= 0),
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ----------------------------------------------------
-- 2. State-Cascade & Validation Triggers
-- ----------------------------------------------------

-- Function to handle trip transitions
CREATE OR REPLACE FUNCTION public.handle_trip_status_change()
RETURNS trigger AS $$
DECLARE
  v_status text;
  v_max_cap numeric;
  v_odometer numeric;
  d_status text;
  d_expiry date;
BEGIN
  -- Fetch current vehicle info
  SELECT status, max_load_capacity, odometer
  INTO v_status, v_max_cap, v_odometer
  FROM public.vehicles
  WHERE id = NEW.vehicle_id;

  -- Fetch current driver info
  SELECT status, license_expiry_date
  INTO d_status, d_expiry
  FROM public.drivers
  WHERE id = NEW.driver_id;

  -- Rules on transition to 'Dispatched' (or inserted as 'Dispatched')
  -- Fix 1: Dispatched status is only reachable from Draft or on first Insert
  IF NEW.status = 'Dispatched' AND (TG_OP = 'INSERT' OR OLD.status = 'Draft') THEN
    
    -- Rule 2: Vehicles Retired or In Shop cannot be assigned
    IF v_status IN ('Retired', 'In Shop') THEN
      RAISE EXCEPTION 'Vehicle is % and cannot be assigned to a trip', v_status;
    END IF;

    -- Rule 3: Drivers with expired license or Suspended status cannot be assigned
    IF d_expiry < current_date THEN
      RAISE EXCEPTION 'Driver license has expired (Expiry: %)', d_expiry;
    END IF;
    IF d_status = 'Suspended' THEN
      RAISE EXCEPTION 'Driver is Suspended and cannot be assigned to trips';
    END IF;

    -- Rule 4: Vehicle/Driver already On Trip cannot be assigned
    IF v_status = 'On Trip' THEN
      RAISE EXCEPTION 'Vehicle is already On Trip on another active assignment';
    END IF;
    IF d_status = 'On Trip' THEN
      RAISE EXCEPTION 'Driver is already On Trip on another active assignment';
    END IF;

    -- Rule 5: Cargo Weight limit check
    IF NEW.cargo_weight > v_max_cap THEN
      RAISE EXCEPTION 'Cargo weight of % kg exceeds the maximum vehicle capacity of % kg', NEW.cargo_weight, v_max_cap;
    END IF;

    -- Update states to On Trip
    UPDATE public.vehicles SET status = 'On Trip' WHERE id = NEW.vehicle_id;
    UPDATE public.drivers SET status = 'On Trip' WHERE id = NEW.driver_id;
    NEW.dispatched_at = now();

  -- Rules on transition to 'Completed' (from 'Dispatched')
  ELSIF NEW.status = 'Completed' AND (TG_OP = 'UPDATE' AND OLD.status = 'Dispatched') THEN
    -- Require final_odometer and fuel_consumed
    IF NEW.final_odometer IS NULL OR NEW.final_odometer <= 0 THEN
      RAISE EXCEPTION 'Final odometer reading is required to complete the trip';
    END IF;
    IF NEW.fuel_consumed IS NULL OR NEW.fuel_consumed <= 0 THEN
      RAISE EXCEPTION 'Fuel consumed is required to complete the trip';
    END IF;

    -- Odometer validation
    IF NEW.final_odometer < v_odometer THEN
      RAISE EXCEPTION 'Final odometer (%) cannot be less than starting vehicle odometer (%)', NEW.final_odometer, v_odometer;
    END IF;

    -- Reset status and update vehicle odometer
    UPDATE public.vehicles SET status = 'Available', odometer = NEW.final_odometer WHERE id = NEW.vehicle_id;
    UPDATE public.drivers SET status = 'Available' WHERE id = NEW.driver_id;
    NEW.completed_at = now();

  -- Rules on transition to 'Cancelled' (from 'Dispatched')
  ELSIF NEW.status = 'Cancelled' AND (TG_OP = 'UPDATE' AND OLD.status = 'Dispatched') THEN
    -- Reset to Available
    UPDATE public.vehicles SET status = 'Available' WHERE id = NEW.vehicle_id;
    UPDATE public.drivers SET status = 'Available' WHERE id = NEW.driver_id;
  
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trips_status_cascade_trigger
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_status_change();

-- Function to handle maintenance logs
CREATE OR REPLACE FUNCTION public.handle_maintenance_log_change()
RETURNS trigger AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.vehicles WHERE id = NEW.vehicle_id;

  -- Rule 9: Active maintenance log created
  IF NEW.is_active = true AND (TG_OP = 'INSERT' OR OLD.is_active = false) THEN
    IF v_status IS DISTINCT FROM 'Retired' THEN
      UPDATE public.vehicles SET status = 'In Shop' WHERE id = NEW.vehicle_id;
    END IF;
    NEW.closed_at = NULL;

  -- Rule 10: Maintenance log closed
  ELSIF NEW.is_active = false AND (TG_OP = 'UPDATE' AND OLD.is_active = true) THEN
    NEW.closed_at = now();
    IF v_status IS DISTINCT FROM 'Retired' THEN
      -- Only mark Available if no other active maintenance logs remain
      IF NOT EXISTS (
        SELECT 1 FROM public.maintenance_logs
        WHERE vehicle_id = NEW.vehicle_id AND is_active = true AND id != NEW.id
      ) THEN
        UPDATE public.vehicles SET status = 'Available' WHERE id = NEW.vehicle_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER maintenance_logs_status_cascade_trigger
  BEFORE INSERT OR UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_log_change();

-- Sync Auth Users to Public Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Fix 2: Default role to driver. Do not trust metadata from signup
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id,
    new.email,
    'driver'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper to fetch user role safely
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. users
CREATE POLICY "Users can read profiles" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fleet Manager can manage users" ON public.users FOR ALL TO authenticated USING (get_user_role() = 'fleet_manager');

-- 2. vehicles
CREATE POLICY "All authenticated users can read vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fleet Manager can edit vehicles" ON public.vehicles FOR ALL TO authenticated USING (get_user_role() = 'fleet_manager');

-- 3. drivers
CREATE POLICY "All authenticated users can read drivers" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fleet Manager can manage drivers" ON public.drivers FOR ALL TO authenticated USING (get_user_role() = 'fleet_manager');
CREATE POLICY "Safety Officer can update drivers" ON public.drivers FOR UPDATE TO authenticated USING (get_user_role() = 'safety_officer');

-- 4. trips
CREATE POLICY "All authenticated users can read trips" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fleet Manager and Driver can insert/update trips" ON public.trips FOR ALL TO authenticated 
  USING (get_user_role() IN ('fleet_manager', 'driver'));

-- 5. maintenance_logs
CREATE POLICY "All authenticated users can read maintenance logs" ON public.maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fleet Manager can manage maintenance logs" ON public.maintenance_logs FOR ALL TO authenticated USING (get_user_role() = 'fleet_manager');

-- 6. fuel_logs & expenses
CREATE POLICY "All authenticated users can read logs/expenses" ON public.fuel_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fleet Manager and Driver can log fuel" ON public.fuel_logs FOR ALL TO authenticated USING (get_user_role() IN ('fleet_manager', 'driver'));

CREATE POLICY "All authenticated users can read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fleet Manager and Driver can log expenses" ON public.expenses FOR ALL TO authenticated USING (get_user_role() IN ('fleet_manager', 'driver'));
