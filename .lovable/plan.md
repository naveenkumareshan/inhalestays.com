

# Property-Level Access Control for Partner Employees

## Problem
Currently, employees see ALL properties owned by their partner. A partner with 3 reading rooms and 2 hostels cannot restrict Employee A to only "Room Alpha" and Employee B to only "Room Beta". Need property-level assignment per employee.

## Approach
Add an `allowed_properties` column (UUID array) to the `vendor_employees` table. When empty/null, the employee can access ALL partner properties (backward compatible). When populated, the employee can only see and operate on those specific cabins/hostels.

## Changes

### 1. Database Migration
- Add `allowed_properties uuid[] DEFAULT '{}'` column to `vendor_employees` table

### 2. `src/api/vendorEmployeeService.ts`
- Add `allowed_properties: string[]` to `VendorEmployeeData`, `VendorEmployeeCreateData`, `VendorEmployeeUpdateData`
- Include in create/update payloads

### 3. `src/contexts/AuthContext.tsx`
- Fetch `allowed_properties` alongside `permissions` and `partner_user_id` in `buildUser()`
- Store on the `User` object (add to User interface)

### 4. `src/components/vendor/VendorEmployeeForm.tsx`
- Add a "Property Access" section after permissions table
- Fetch partner's cabins and hostels (using `getEffectiveOwnerId` → query cabins/hostels by `created_by`)
- Show two lists: Reading Rooms and Hostels, each with checkboxes
- Option: "All Properties" toggle (clears the array) vs specific selection
- Save selected property IDs to `allowed_properties`

### 5. `src/api/vendorSeatsService.ts` — `getVendorCabins()`
- After fetching cabins by `created_by = ownerId`, if user is `vendor_employee`, filter results by `allowed_properties` (if non-empty)
- Read `allowed_properties` from the employee record (or pass from auth context)

### 6. Hostel flows — similar filtering
- In hostel listing queries used by partners/employees, apply the same `allowed_properties` filter for employees

## Key Implementation Detail

**Employee Form — Property Access section:**
```typescript
{/* Property Access */}
<div>
  <Label className="text-xs font-medium">Property Access</Label>
  <p className="text-[10px] text-muted-foreground mb-2">
    Leave "All Properties" on to grant access to everything, or select specific properties
  </p>
  <div className="flex items-center gap-2 mb-2">
    <Checkbox checked={allProperties} onCheckedChange={toggleAll} />
    <span className="text-xs">All Properties (no restriction)</span>
  </div>
  {!allProperties && (
    <>
      <p className="text-[10px] font-medium mb-1">Reading Rooms</p>
      {cabins.map(c => (
        <div key={c.id} className="flex items-center gap-2">
          <Checkbox checked={selectedProps.includes(c.id)} 
                    onCheckedChange={() => toggleProp(c.id)} />
          <span className="text-xs">{c.name}</span>
        </div>
      ))}
      <p className="text-[10px] font-medium mb-1 mt-2">Hostels</p>
      {hostels.map(h => (...))}
    </>
  )}
</div>
```

**Filtering in getVendorCabins:**
```typescript
// After fetching all partner cabins, filter for employee
if (!isAdmin) {
  const { data: empRecord } = await supabase
    .from('vendor_employees')
    .select('allowed_properties')
    .eq('employee_user_id', authUser.id)
    .maybeSingle();
  
  if (empRecord?.allowed_properties?.length > 0) {
    cabinData = cabinData.filter(c => 
      empRecord.allowed_properties.includes(c._id)
    );
  }
}
```

| File | Change |
|------|------|
| DB Migration | Add `allowed_properties uuid[]` to `vendor_employees` |
| `src/api/vendorEmployeeService.ts` | Include `allowed_properties` in CRUD |
| `src/contexts/AuthContext.tsx` | Fetch & store `allowed_properties` on User |
| `src/components/vendor/VendorEmployeeForm.tsx` | Property selection UI |
| `src/api/vendorSeatsService.ts` | Filter cabins by `allowed_properties` for employees |
| Hostel listing queries | Same filtering for hostel properties |

