# Implementation Plan - TransitOps UI/Component Completeness Pass (Phase 2)

This plan details the restructuring and creation of new UI components for the Maintenance page, Fuel & Expense Management, Reports KPI and optional charts, and the new Settings page static RBAC reference matrix.

## User Review Required

> [!IMPORTANT]
> **Settings Page Scope**: The Settings page will strictly contain the static **Role-Based Access Control (RBAC)** reference matrix matching the database's existing RLS policies. The left-hand "General Settings" form will be skipped as requested.
> 
> **Maintenance Actions Safety**: We will omit the "Delete" button entirely from the maintenance actions column. Only the "Complete & Release" action (which triggers the database status reset to Available via status update) will be present for active logs.
> 
> **Reports Phase Gate**: We will first build and verify the 4 mandatory KPI cards (Fuel Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI). We will explicitly inform you when this step is verified before commencing the optional Monthly Revenue and Top Costliest Vehicles chart components.

## Open Questions

> [!IMPORTANT]
> **Average Vehicle ROI KPI Formula Choice**:
> Please specify which formula you prefer for the "Average Vehicle ROI" KPI card:
> 
> * **Option A (Weighted Fleet-wide ROI)**: Total fleet net profit divided by total fleet acquisition cost.
>   $$\text{Fleet ROI} = \frac{\sum \text{NetProfit}_v}{\sum \text{AcquisitionCost}_v} \times 100$$
>   *Note: This naturally weights the ROI by acquisition scale, preventing cheap vehicles with high percentages from skewing the fleet ROI.*
> 
> * **Option B (Simple Average of Vehicle ROIs)**: Simple arithmetic mean of each individual vehicle's ROI percentage.
>   $$\text{Average ROI} = \frac{\sum \text{VehicleROI}_v}{N_{\text{vehicles}}}$$
>   *Note: This treats each vehicle equally. Vehicles with zero completed trips and zero costs (including Retired ones) will register $0\%$ ROI, and those with costs but no revenue will register negative ROI.*

## Proposed Changes

---

### Maintenance Component

#### [MODIFY] [MaintenanceClient.tsx](file:///c:/Users/HP/Desktop/WebDev/Odoo_Hackathon/src/components/MaintenanceClient.tsx)
- Restructure the page layout into a responsive two-column grid:
  - **Left Column**: The "Log Service Record" form (Vehicle, Service Type/Description, Cost, Date, Status select/toggle).
    - If the logged-in user is not a `fleet_manager`, show a locked access-restricted placeholder.
    - Status select is bound to the `is_active` boolean column, presenting options: `"Active" (In Shop)` and `"Closed" (Completed)`.
    - Below the form, display a static informational text flow diagram showing vehicle transitions:
      - `Available → (creating active record) → In Shop`
      - `In Shop → (closing record, not retired) → Available`
      - Inline Caption: *"Note: In Shop vehicles are removed from the dispatch pool."*
  - **Right Column**: The "Service Log" list rendered as a table with columns: `Vehicle`, `Service`, `Cost`, `Status`, `Actions`.
    - Render statuses using existing status badge colors (amber for In Shop, emerald for Completed).
    - Actions column containing **only** "Complete & Release" (visible only if log `is_active` is true). No delete button.

---

### Fuel & Expense Management Component

#### [MODIFY] [page.tsx](file:///c:/Users/HP/Desktop/WebDev/Odoo_Hackathon/src/app/\(dashboard\)/expenses/page.tsx)
- Add database select statement to query `maintenance_logs` and pass them to the client-side component, enabling the page-level Total Operational Cost calculation.

#### [MODIFY] [ExpensesClient.tsx](file:///c:/Users/HP/Desktop/WebDev/Odoo_Hackathon/src/components/ExpensesClient.tsx)
- Remove the tab interface so that **both tables** are rendered simultaneously (stacked vertically or in columns).
- **Fuel Logs Table**: Display vehicle registration/model, Date, Liters, and Cost. Move the "Log Fuel" and "Add Expense" buttons to the top-right header area.
- **Other Expenses Table**: Display columns `Trip`, `Vehicle`, `Toll`, `Other`, `Maint (linked)`, `Total`.
  - Calculate grouped operational expenses per vehicle.
  - Omit any status badges or columns as expenses do not carry status indicators in the database schema.
- **Cost Summary Row**: Display a summary block at the bottom: `"Total Operational Cost (Auto) = Fuel + Maint"`, reusing the exact reports cost aggregation logic (`Total Fuel logs cost + Total Maintenance logs cost`).

---

### Reports & Analytics Component

#### [MODIFY] [ReportsClient.tsx](file:///c:/Users/HP/Desktop/WebDev/Odoo_Hackathon/src/components/ReportsClient.tsx)
- Implement exactly the **4 required KPI cards**:
  - **Average Fuel Efficiency**: `Total completed trips distance / Total fuel consumed`.
  - **Fleet Utilization**: `% of non-retired vehicles currently on trip`.
  - **Total Operational Cost**: `Fuel cost + Maintenance cost`.
  - **Average Vehicle ROI**: Average vehicle return-on-investment percentage (based on the chosen formula option).
- Add the **Monthly Revenue** bar chart and **Top Costliest Vehicles** ranked bar list below the main metrics registry table (after verification gate).

---

### Settings Component

#### [NEW] [page.tsx](file:///c:/Users/HP/Desktop/WebDev/Odoo_Hackathon/src/app/\(dashboard\)/settings/page.tsx)
- Create settings route folder and page file. Fetches current authenticated user and passes their role to `SettingsClient`.

#### [NEW] [SettingsClient.tsx](file:///c:/Users/HP/Desktop/WebDev/Odoo_Hackathon/src/components/SettingsClient.tsx)
- Create a client-side component displaying the static hardcoded **Role-Based Access Control (RBAC)** matrix mapping roles (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst) against screens (Dashboard, Vehicles, Drivers, Trips, Maintenance, Expenses, Reports), matching RLS policies.

#### [MODIFY] [DashboardLayoutWrapper.tsx](file:///c:/Users/HP/Desktop/WebDev/Odoo_Hackathon/src/components/DashboardLayoutWrapper.tsx)
- Import `Settings` icon and append the "Settings" item to sidebar navigation items for all authenticated roles.

---

## Verification Plan

### Automated Tests
- Run `node verify_workflow.js` to assert triggers and database constraints are completely green.
- Run `npm run build` to confirm compiling is successful.

### Manual Verification
- Visual inspection of the updated pages via browser agent to confirm clean styling, appropriate responsive columns, and accurate labels.
