# DVOM Project Context - Session Summary

## Project Overview
Building a parts ordering system for FRC Team 8044 (Denham Venom) using Google Apps Script, Google Sheets, and Monday.com integration via Zapier.

## Current Session Accomplishments

### 1. Product Code Feature (COMPLETED)
- Added Product Code column to Parts sheet at position E (column 4, 0-based)
- **Frontend changes (WebApp.html):**
  - Added Product Code search box in Order Parts tab (lines 517-521)
  - Added Product Code field to Add Part form (lines 705-709)
  - Updated `displayParts()` to show product code in LSU gold below Part ID (line 1101)
  - Updated `searchParts()` to handle product code searches (lines 1028-1084)
  - Updated `submitNewPart()` to collect product code value (line 1755)

- **Backend changes (Code.js):**
  - Fixed column indices in `getPartsByFilters()` to include Product Code (lines 144-158, 202-217)
  - Added `getPartsByProductCode()` function for case-insensitive searches (lines 228-295)
  - Updated `addPartToDirectory()` to insert product code at array index 4 (lines 594-616)

- **Sample data updated:**
  - Updated generateSampleParts.js with product codes for all 72 parts at array index 4
  - Updated column range from 17 to 18 columns (Parts!A2:Q → Parts!A2:R)

### 2. WCP Parts Import (ATTEMPTED - HAS ERRORS)

**Added 11th Category: "Hardware"**
- For spacers, tube plugs, nut strips

**Import Status:**
- WCP parts were imported but with errors
- CSV files exported from Google Sheets showing current state:
  - `C:\Users\frc80\OneDrive\Documents\DVOM\Testing\Spreadsheets\Part Directory - Spec Config.csv`
  - `C:\Users\frc80\OneDrive\Documents\DVOM\Testing\Spreadsheets\Part Directory - Categories.csv`
  - `C:\Users\frc80\OneDrive\Documents\DVOM\Testing\Spreadsheets\Part Directory - Parts (1).csv`

**Category Mapping Created:**
- Fasteners: Bolts, screws, washers, rivets
- Movement: Gears, sprockets, bearings, bushings, timing components, chain
- Electronics and Sensors: CTRE components, motors, sensors
- Raw Stock: Shaft stock, carbon fiber, SRPP tubing
- Wiring, Cables, Connectors: Wire, cable carriers
- Hardware: Spacers, tube plugs, nut strips (NEW)
- Machining Tools: CNC accessories, chain breaker

## Current Issues

### WCP Import Errors
- Import script ran but produced errors (details in exported CSV files)
- Need to analyze the exported CSVs to determine:
  - What data was incorrectly imported
  - What validation failed
  - What spec extraction failed
  - Whether categories/subcategories are properly assigned

## System Architecture

### Google Sheets Structure
**Parts Directory Sheet** (ID: 1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo)
- **Parts Sheet**: 18 columns
  - A: Part ID, B: Part Name, C: Category, D: Subcategory
  - E: Product Code (NEW - added this session)
  - F: Spec 1, G: Spec 2, H: Spec 3, I: Spec 4
  - J: Quantity Per, K: Cost, L: Supplier, M: Order Link
  - N: Location/Bin, O: Notes, P: Status, Q: Date Added, R: Added By

- **Spec Config Sheet**: Dynamic spec field definitions per category/subcategory
- **Categories Sheet**: Category list (now includes Hardware)

**Parts Orders Sheet**: Order tracking, student roster, custom requests

### Key Features Implemented
1. **Dynamic Spec System**: Category-specific spec fields with labels
2. **Order Interface**: Cart system with individual order submissions
3. **Leadership Password**: venom8044 (required for order submission)
4. **Custom Part Requests**: CUSTOM-### IDs for non-inventory parts
5. **Product Code Search**: Quick search by manufacturer part numbers

### Password Protection
- Add Part to Directory: `venom8044`
- Submit Orders: `venom8044` (team leader approval)

## File Locations

### Source Code
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/src/Code.js` - Backend functions
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/src/WebApp.html` - Frontend UI
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/credentials.json` - Google API credentials

### Setup Scripts
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/setup/generateSampleParts.js` - Sample data with product codes
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/setup/addProductCodeColumn.js` - Column insertion script
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/setup/importWCPParts.js` - WCP import (may exist with errors)

### Data Files
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/Testing/WCP_Parts.csv` - Original WCP catalog (757 lines)
- `/mnt/c/Users/frc80/OneDrive/Documents/DVOM/Testing/Spreadsheets/Part Directory - Parts (1).csv` - Exported parts with errors

## NPM Commands
- `npm run push` - Deploy code to Google Apps Script
- `npm run open` - Open web app in browser
- `npm run logs` - View execution logs
- `npm run deploy` - Create new deployment

## Next Steps (PRIORITY)

1. **Analyze WCP Import Errors**
   - Read the three exported CSV files
   - Identify what went wrong during import
   - Determine if data corruption occurred

2. **Fix Import Issues**
   - May need to clear imported WCP data and re-import
   - Fix spec extraction logic
   - Validate category mappings

3. **Test Product Code Feature**
   - Deploy updated code: `npm run push`
   - Test product code search functionality
   - Verify product codes display correctly

4. **Update Spec Config**
   - Ensure Hardware category is properly configured
   - Add any WCP-specific subcategories needed

## Team Branding
- Team: 8044 Denham Venom
- Colors: LSU Purple (#461D7C), LSU Gold (#FDD023)
- NO EMOJIS anywhere in the system

## Important Notes
- All column indices shifted right by 1 after Product Code insertion
- Stock status from WCP should be IGNORED (user request)
- Pack quantities should be extracted from descriptions
- Smart spec extraction needed per part type

## Background Processes Still Running
Multiple background bash processes from previous operations - may need cleanup on restart.
