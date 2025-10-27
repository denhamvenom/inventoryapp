# DVOM Parts System - Dynamic Specs Refactor Plan

## Project Goal
Implement a dynamic, category-specific specification system that allows:
- Each category/subcategory to define its own spec fields (Type, Size, Length, Material, etc.)
- Dynamic spec filter dropdowns in the order form
- "Add New" functionality for custom spec values
- Fix current bugs: student names not loading, parts showing $0.00 and 0 stock

## Pre-Execution Checklist

### YOU Must Complete These Steps:
1. **Backup spreadsheets** - Make copies in Google Drive
2. **Clear Parts data** - Delete rows 2+ in Parts Directory → Parts sheet (keep header row 1)
3. **Verify Students** - Confirm Parts Orders → Students sheet has names in column A
4. **Confirm ready** - Tell Claude to proceed with the plan

## Agent Allocation (Max 3 Agents)

### Agent 1: Database Structure and Backend
- Create Spec Config sheet structure
- Update Parts sheet column headers
- Generate spec configuration data for all categories/subcategories
- Update Code.js with fixed column mappings and new spec functions
- Update DataAccess.js with proper IDs and sheet names
- Fix getStudents() to use correct spreadsheet

### Agent 2: Frontend - Order Form
- Update WebApp.html order form section
- Implement dynamic spec filter dropdowns
- Load spec config and show only populated specs with proper labels
- Fix parts display to show correct costs and quantities
- Update part search/filter logic to handle 4 specs
- Fix student name dropdown

### Agent 3: Frontend - Add Part Form
- Update WebApp.html add part form section
- Implement dynamic spec fields based on category/subcategory selection
- Add "Add New..." functionality for each spec dropdown
- Show/hide spec fields based on configuration
- Update validation to check required specs dynamically

## Detailed Implementation Plan

### Phase 1: Database Structure (Agent 1)

#### 1.1 Create Spec Config Sheet
Location: Parts Directory → New "Spec Config" tab

Columns:
- Category (text)
- Subcategory (text)
- Spec1_Label (text) - e.g., "Type", "Material"
- Spec2_Label (text) - e.g., "Size", "Gauge"
- Spec3_Label (text) - e.g., "Length", "Thickness"
- Spec4_Label (text) - e.g., "Material", "Color"
- Spec1_Required (Y/N)
- Spec2_Required (Y/N)
- Spec3_Required (Y/N)
- Spec4_Required (Y/N)

Initial configurations needed:
- Fasteners → Screws: Type, Size, Length, Material (Y,Y,Y,N)
- Fasteners → Nuts: Type, Size, -, Material (Y,Y,N,Y)
- Fasteners → Washers: Type, Size, -, Material (Y,Y,N,N)
- Fasteners → Rivets: Type, Size, Grip Range, Material (Y,Y,Y,N)
- Fasteners → Adhesive: Type, Strength, -, - (Y,Y,N,N)
- Electronics and Sensors → Motor Controllers: Type, Current, -, - (Y,Y,N,N)
- Electronics and Sensors → Sensors: Type, Interface, -, - (Y,Y,N,N)
- Electronics and Sensors → Power Distribution: Type, Channels, -, - (Y,Y,N,N)
- Raw Stock → Aluminum: Form, Dimensions, Thickness, Alloy (Y,Y,Y,Y)
- Raw Stock → Polycarbonate: Form, Dimensions, Thickness, - (Y,Y,Y,N)
- Raw Stock → Steel: Form, Dimensions, Thickness, Grade (Y,Y,Y,Y)
- Movement → Motors: Type, Size, Free Speed, - (Y,Y,Y,N)
- Movement → Bearings: Type, Bore, OD, - (Y,Y,Y,N)
- Movement → Gearboxes: Type, Ratio, Stages, - (Y,Y,N,N)
- Movement → Chain: Pitch, -, -, - (Y,N,N,N)
- Movement → Sprockets: Pitch, Teeth, Bore, - (Y,Y,Y,N)
- Build Site Equipment → Power Tools: Type, Voltage, -, - (Y,Y,N,N)
- Build Site Equipment → Cleaning: Type, Capacity, -, - (Y,Y,N,N)
- Build Site Equipment → Lighting: Type, Lumens, -, - (Y,Y,N,N)
- Pneumatics → Cylinders: Type, Bore, Stroke, - (Y,Y,Y,N)
- Pneumatics → Valves: Type, Ports, Voltage, - (Y,Y,Y,N)
- Pneumatics → Regulators: Type, Max PSI, -, - (Y,Y,N,N)
- Pneumatics → Tubing: Material, OD, -, - (Y,Y,N,N)
- Business, Outreach, Media → Apparel: Type, Size, Color, - (Y,Y,Y,N)
- Business, Outreach, Media → Display: Type, Dimensions, -, - (Y,Y,N,N)
- Business, Outreach, Media → Marketing: Type, Dimensions, -, - (Y,Y,N,N)
- Machining Tools → Cutting Tools: Type, Size, Flutes, Material (Y,Y,N,Y)
- Machining Tools → Threading Tools: Type, Size, -, - (Y,Y,N,N)
- Machining Tools → Measuring Tools: Type, Range, Resolution, - (Y,Y,Y,N)
- Safety Equipment → Eye Protection: Type, Standard, -, - (Y,Y,N,N)
- Safety Equipment → Hand Protection: Type, Size, Rating, - (Y,Y,Y,N)
- Safety Equipment → Medical: Type, Capacity, -, - (Y,Y,N,N)
- Wiring, Cables, Connectors → Wires: Type, Gauge, Length, Color (Y,Y,Y,Y)
- Wiring, Cables, Connectors → Cables: Type, Length, -, - (Y,Y,N,N)
- Wiring, Cables, Connectors → Connectors: Type, Pins/Rating, -, - (Y,Y,N,N)

#### 1.2 Update Parts Sheet Headers
Current → New:
- "Part ID" → unchanged
- "Part Name" → unchanged
- "Category" → unchanged
- "Subcategory" → unchanged
- "Type" → "Spec 1"
- "Size/Specification 1" → "Spec 2"
- "Specification 2" → "Spec 3"
- ADD NEW: "Spec 4"
- "Quantity Per" → unchanged
- "Cost" → unchanged
- "Supplier" → unchanged
- "Order Link" → unchanged
- "Location/Bin" → unchanged
- "Notes" → unchanged
- "Status" → unchanged
- "Date Added" → unchanged
- "Added By" → unchanged

#### 1.3 Generate Sample Parts Data
Create 60-80 parts across all categories with all 4 specs populated where applicable.

Examples:
- FAST-001, Socket Head Cap Screw, Fasteners, Screws, Socket Head, 8-32, 0.5", Stainless Steel, Box of 100, 8.99, ...
- ELEC-001, Spark MAX Motor Controller, Electronics and Sensors, Motor Controllers, Brushless, 40A, -, -, Each, 89.99, ...
- WIRE-001, Power Wire, Wiring/Cables/Connectors, Wires, Power, 12 AWG, 10 ft, Red, Each, 14.99, ...

### Phase 2: Backend Code (Agent 1)

#### 2.1 Code.js Updates

Fix configuration:
```javascript
const CONFIG = {
  PARTS_DIRECTORY_ID: '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo',
  PARTS_ORDERS_ID: '1f-4T0wMjLQKnA-dbFMgUDRKnSuwi0kjdSl91MuRHpeQ',
  PARTS_SHEET_NAME: 'Parts',
  ORDERS_SHEET_NAME: 'Orders',
  STUDENTS_SHEET_NAME: 'Students',
  SPEC_CONFIG_SHEET_NAME: 'Spec Config',
  ADD_PART_PASSWORD: 'venom8044'
};
```

Fix getStudents():
- Change from PARTS_DIRECTORY_ID to PARTS_ORDERS_ID
- Use CONFIG.STUDENTS_SHEET_NAME

Fix column mappings in getPartsByFilters():
- "Spec 1", "Spec 2", "Spec 3", "Spec 4" (not "Specifications")
- "Cost" (not "Unit Cost")
- "Location/Bin" (not "Storage Location")
- Update return object structure

Add new functions:
```javascript
/**
 * Gets spec configuration for a category/subcategory
 * @param {string} category - The category name
 * @param {string} subcategory - The subcategory name
 * @returns {Object} Spec configuration with labels and requirements
 */
function getSpecConfig(category, subcategory)

/**
 * Gets unique values for a specific spec field
 * @param {string} category - The category name
 * @param {string} subcategory - The subcategory name
 * @param {number} specNumber - Which spec (1, 2, 3, or 4)
 * @returns {Array<string>} Sorted unique values
 */
function getSpecValues(category, subcategory, specNumber)
```

#### 2.2 DataAccess.js Updates
- Already has correct spreadsheet IDs
- Update sheet name constants to match
- Verify column mappings match Code.js

#### 2.3 FormHandler.js Updates
- Add dynamic spec validation based on spec config
- Validate required specs only

### Phase 3: Order Form Frontend (Agent 2)

#### 3.1 Dynamic Spec Filters

After subcategory selection:
1. Call getSpecConfig(category, subcategory)
2. Clear any existing spec filter dropdowns
3. For each spec (1-4):
   - If spec label exists:
     - Call getSpecValues(category, subcategory, specNumber)
     - If values exist:
       - Create dropdown with proper label
       - Populate with values
       - Show dropdown
4. Update search button to include spec filters

#### 3.2 Part Display Fixes

Update part object mapping to match new column names:
```javascript
{
  partID: data[i][colIndices.partID],
  partName: data[i][colIndices.partName],
  category: data[i][colIndices.category],
  subcategory: data[i][colIndices.subcategory],
  spec1: data[i][colIndices.spec1],
  spec2: data[i][colIndices.spec2],
  spec3: data[i][colIndices.spec3],
  spec4: data[i][colIndices.spec4],
  quantityPer: data[i][colIndices.quantityPer],
  unitCost: data[i][colIndices.cost],  // Fix mapping
  location: data[i][colIndices.location],
  supplier: data[i][colIndices.supplier]
}
```

Display specs with labels from config:
```
Socket Head Cap Screw
FAST-001 - Socket Head | 8-32 | 0.5" | Stainless Steel
In Stock: 100 | Unit Cost: $8.99
```

#### 3.3 Student Dropdown Fix
Already calling getStudents() correctly - just needs backend fix

### Phase 4: Add Part Form Frontend (Agent 3)

#### 4.1 Dynamic Spec Fields

After category/subcategory selection:
1. Call getSpecConfig(category, subcategory)
2. Clear existing spec fields
3. For each spec (1-4):
   - If spec label exists:
     - Create label with spec name + required asterisk if needed
     - Create dropdown
     - Call getSpecValues(category, subcategory, specNumber)
     - Populate dropdown with existing values
     - Add "Add New..." option at bottom
     - Show field
   - Else:
     - Hide field

#### 4.2 "Add New" Functionality

For each spec dropdown:
```javascript
<select id="addPartSpec1" onchange="handleSpecChange(1)">
  <option value="">Select Type...</option>
  <option value="Socket Head">Socket Head</option>
  <option value="Button Head">Button Head</option>
  <option value="__ADD_NEW__">Add New...</option>
</select>
<input type="text" id="addPartSpec1Custom" style="display:none;" placeholder="Enter new Type">
```

When "__ADD_NEW__" selected:
- Hide dropdown
- Show text input
- On blur, validate input
- Use custom value for submission

#### 4.3 Form Validation

Before submission:
1. Get spec config for selected category/subcategory
2. Check all required specs have values
3. Show error if required spec missing

### Phase 5: Testing & Deployment

#### 5.1 Code Deployment
```bash
npm run push
```

#### 5.2 Test in Apps Script Editor
- Run getCategories() - should work
- Run getStudents() - should return names
- Run getSpecConfig("Fasteners", "Screws") - should return config

#### 5.3 Re-deploy Web App
- In Apps Script editor
- Deploy → Manage deployments
- Edit active deployment
- New version
- Deploy

#### 5.4 Test Scenarios
1. Order Form:
   - Select student - names should appear
   - Select Fasteners → Screws
   - Should see: Type, Size, Length dropdowns (not Material since optional)
   - Each dropdown shows only values from inventory
   - Search parts
   - Parts should show correct costs and quantities
   - Add to cart and submit

2. Add Part Form:
   - Enter password (venom8044)
   - Select category → subcategory
   - Spec fields appear with proper labels
   - Required specs marked with asterisk
   - Try "Add New..." for a spec
   - Submit part
   - Verify appears in order form dropdowns

## Code Quality Requirements (from claude.md)

### CRITICAL - NO EMOJIS
- Not in code
- Not in comments
- Not in UI text
- Not in error messages
- Not in success messages
- Not in loading indicators

### Professional Standards
- JSDoc comments for all functions
- Clear, professional error messages
- Comprehensive error handling with try-catch
- Input validation and sanitization
- Professional tone in all user-facing text

### Success Message Examples
- "Order submitted successfully"
- "Part added to directory"
- "Loading parts catalog..."

### Error Message Examples
- "Error: Invalid quantity entered"
- "Failed to load categories: [reason]"
- "Please select a valid subcategory"

## Files to Create/Modify

### Scripts to Create:
- setup/migrateToSpecSystem.js - Main migration script

### Files to Modify:
- src/Code.js - Fix bugs, add spec functions
- src/DataAccess.js - Fix IDs and names
- src/FormHandler.js - Dynamic validation
- src/WebApp.html - Both forms

### Data Files:
- New spec config CSV (for reference)
- New parts CSV with 4 specs

## Post-Execution Verification

### Checklist:
- [ ] Student dropdown shows 15 names
- [ ] Parts show actual costs (not $0.00)
- [ ] Parts show actual quantities (not 0)
- [ ] Spec filter dropdowns appear dynamically
- [ ] Spec labels change per category (Size vs Gauge vs Type)
- [ ] Only populated specs show as filters
- [ ] Add Part form shows relevant specs only
- [ ] "Add New..." works for custom values
- [ ] Required specs are validated
- [ ] No emojis anywhere in system
- [ ] All messages use professional tone

## Rollback Plan

If issues occur:
1. Restore from backup copies
2. Previous deployment still accessible via version history
3. Can revert code changes via git

## Questions Before Starting?

Confirm:
- [ ] Backups created
- [ ] Parts data cleared (rows 2+ deleted)
- [ ] Students sheet verified
- [ ] Ready to proceed

## Execute Command

When ready, tell Claude:
"Execute REFACTOR_PLAN.md with 3 agents"
