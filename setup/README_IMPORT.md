# WCP Parts Import Script

## Purpose
Import West Coast Products parts catalog from CSV into Google Sheets Parts database with intelligent categorization and spec extraction.

## Quick Usage
```bash
npm run import-wcp
```

## What It Does
1. Parses WCP_Parts.csv (757 lines, hierarchical structure)
2. Extracts product codes, prices, pack quantities
3. Intelligently categorizes parts into 7 categories
4. Extracts type-specific specifications (4 specs per part)
5. Generates unique Part IDs (FAST-001, MOVE-013, etc.)
6. Checks for duplicates against existing database
7. Batch uploads to Google Sheets
8. Generates comprehensive import report

## Configuration
Located at top of `importWCPParts.js`:
```javascript
const CREDENTIALS_PATH = '/path/to/credentials.json';
const CSV_PATH = '/path/to/WCP_Parts.csv';
const SPREADSHEET_ID = 'your-spreadsheet-id';
const SHEET_NAME = 'Parts';
```

## Categories Supported
- Fasteners (FAST-XXX)
- Movement (MOVE-XXX)
- Electronics and Sensors (ELEC-XXX)
- Raw Stock (RAWM-XXX)
- Wiring, Cables, Connectors (WIRE-XXX)
- Hardware (HARD-XXX)
- Machining Tools (TOOL-XXX)

## Spec Extraction by Type

### Fasteners
Type | Thread Size | Length | Material

### Gears
Gear Type | Tooth Count | Bore | Diametral Pitch

### Bearings
Type | ID | OD | WD

### Timing Components
Type | Teeth/Length | Width | Bore/Pitch

### Sprockets
Chain Pitch | Tooth Count | Bore | Hub Style

### Electronics
Component Type | Model | Rating/Interface | Additional

### Hardware
Type | Size | Material | Dimensions

## Output Format
18 columns per part:
1. Part ID
2. Part Name
3. Category
4. Subcategory
5. Product Code
6. Spec 1
7. Spec 2
8. Spec 3
9. Spec 4
10. Quantity Per
11. Cost
12. Supplier
13. Order Link
14. Location (empty)
15. Notes (empty)
16. Status
17. Date Added
18. Added By

## Features
- Duplicate detection (product code matching)
- Auto-incrementing Part IDs per category
- Batch upload for performance
- Comprehensive error handling
- Detailed reporting with warnings
- Safe re-runs (skips existing parts)

## Expected Results
From 757-line WCP CSV:
- 593 part entries parsed
- 567 parts successfully imported
- 24 duplicates skipped (if re-run)
- 2 invalid entries skipped
- 87 warnings (mostly missing specs for accessories)

## Category Breakdown
Typical import distribution:
- Movement: ~425 parts (gears, bearings, sprockets, motors)
- Fasteners: ~72 parts (bolts, screws)
- Hardware: ~27 parts (spacers, plugs, clamps)
- Wiring: ~17 parts (cables, connectors)
- Electronics: ~14 parts (CTRE components, sensors)
- Raw Stock: ~11 parts (shaft stock, tubing)
- Tools: ~1 part (chain breaker)

## Error Handling
Script will:
- Skip parts without valid product codes
- Skip duplicate product codes
- Warn about parts with no specs extracted
- Continue processing after individual failures
- Report all issues in final summary

## Performance
- Parse time: ~2-3 seconds
- Upload time: ~1-2 seconds
- Total runtime: 3-5 seconds

## Dependencies
- googleapis (Google Sheets API)
- csv-parse (CSV parsing)
- fs (file system access)

## Troubleshooting

**No parts uploaded?**
- All may be duplicates if re-running
- Check CSV file path
- Verify file format matches expected structure

**Authentication errors?**
- Check credentials.json path
- Verify service account permissions
- Ensure spreadsheet shared with service account

**Incorrect categorization?**
- Review CATEGORY_MAP keywords
- Update keywords for new part types
- Parts default to Movement if no match

**Poor spec extraction?**
- Check extraction function regex patterns
- Add logging to debug specific parts
- Some accessories don't have structured specs

## Documentation
See `/docs/WCP_IMPORT_GUIDE.md` for complete documentation including:
- Detailed spec extraction patterns
- CSV format specification
- Category mapping logic
- Extension guide
- Troubleshooting

## Version
1.0.0 - Initial release (2025-10-28)
