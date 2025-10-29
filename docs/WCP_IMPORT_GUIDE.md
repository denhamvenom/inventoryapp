# WCP Parts Import System Documentation

## Overview
The WCP Parts Import System is designed to parse West Coast Products CSV exports and import them into the Denham Venom Parts Database with intelligent spec extraction and automatic categorization.

## Quick Start

### Prerequisites
- Node.js installed
- Google Sheets API credentials configured at `/credentials.json`
- WCP CSV file at `/Testing/WCP_Parts.csv`
- NPM dependencies installed (`npm install`)

### Running the Import
```bash
npm run import-wcp
```

## System Architecture

### File Structure
```
setup/
└── importWCPParts.js    # Main import script (840+ lines)

Testing/
└── WCP_Parts.csv        # Source CSV file (757 lines)
```

### Import Flow
1. **Authentication**: Authenticate with Google Sheets API using service account credentials
2. **Fetch Existing Data**: Query Google Sheets to get existing product codes and max Part IDs
3. **Parse CSV**: Read and parse hierarchical CSV structure
4. **Process Parts**: Extract data, detect categories, extract specs for each part
5. **Upload to Sheets**: Batch upload all processed parts to Google Sheets
6. **Generate Report**: Display comprehensive import statistics

## CSV Format

### Structure
The WCP CSV has a hierarchical structure:
```
West Coast Products Parts
,Category Name Website: https://wcproducts.com/...
,,Subcategory Name
,,,Part Description�(PRODUCT-CODE)+$PRICE StockStatus
```

### Example
```csv
,Bolts WCP Website: https://wcproducts.com/products/bolts
,,#10-32 BHCS
,,,"#10-32 x .250"" L BHCS (Steel, Black Oxide) (50-Pack)�(WCP-0251)+$3.99 In Stock"
```

## Category Mapping

### Detection Logic
Parts are automatically categorized based on keywords in the description:

| Category | Keywords |
|----------|----------|
| Fasteners | bolt, screw, bhcs, shcs, phcs, shoulder, rivet, washer, nut |
| Movement | gear, spur, pocketed, timing pulley, sprocket, #25, #35, bearing, bushing, motor, chain, belt |
| Electronics and Sensors | pdp, ctre, cancoder, pigeon, canivore, sensor, encoder |
| Raw Stock | shaft stock, carbon fiber, srpp, tubing |
| Wiring, Cables, Connectors | wire, cable carrier |
| Hardware | spacer, tube plug, nut strip, clamp |
| Machining Tools | cnc, workholding, chain breaker |

**Default**: If no keywords match, parts default to "Movement" (WCP is primarily drivetrain supplier)

### Part ID Generation
Part IDs are auto-generated based on category:
- **Fasteners**: FAST-001, FAST-002, ...
- **Movement**: MOVE-001, MOVE-002, ...
- **Electronics and Sensors**: ELEC-001, ELEC-002, ...
- **Raw Stock**: RAWM-001, RAWM-002, ...
- **Wiring, Cables, Connectors**: WIRE-001, WIRE-002, ...
- **Hardware**: HARD-001, HARD-002, ...
- **Machining Tools**: TOOL-001, TOOL-002, ...

IDs continue from the highest existing ID in each category.

## Spec Extraction

### Fasteners
- **Spec1**: Type (BHCS, SHCS, PHCS, Shoulder Bolt, etc.)
- **Spec2**: Thread Size (#10-32, 1/4-20, etc.)
- **Spec3**: Length (.250", .500", etc.)
- **Spec4**: Material (Steel, Black Oxide, Stainless, etc.)

**Example**: `#10-32 x .500" L BHCS (Steel, Black Oxide)`
- Spec1: BHCS
- Spec2: #10-32
- Spec3: 500"
- Spec4: Black Oxide

### Gears
- **Spec1**: Gear Type (Spur, Pocketed Spur, Motor Gear)
- **Spec2**: Tooth Count (14t, 24t, etc.)
- **Spec3**: Bore (3/8" Hex, 1/2" Hex, 8mm SplineXS, etc.)
- **Spec4**: Diametral Pitch (20 DP, 32 DP, etc.)

**Example**: `14t Aluminum Spur Gear (20 DP, 3/8" Hex Bore)`
- Spec1: Spur
- Spec2: 14t
- Spec3: 3/8" Hex
- Spec4: 20 DP

### Bearings
- **Spec1**: Type (Flanged, Radial, X-Contact, Metric, Thrust, Needle)
- **Spec2**: ID (inside diameter with units)
- **Spec3**: OD (outside diameter with units)
- **Spec4**: WD (width with units)

**Example**: `0.250" ID x 0.625" OD x 0.196" WD (Flanged Bearing)`
- Spec1: Flanged
- Spec2: 0.250"
- Spec3: 0.625"
- Spec4: 0.196"

### Timing Components (Pulleys and Belts)
- **Spec1**: Type (GT2/GT3, HTD)
- **Spec2**: Tooth Count / Length
- **Spec3**: Width
- **Spec4**: Bore (for pulleys) / Pitch (for belts)

**Example**: `16t x 9mm Wide Aluminum Pulley (GT2 3mm, 8mm SplineXS Bore)`
- Spec1: GT2/GT3
- Spec2: 16t
- Spec3: 9mm
- Spec4: 8mm SplineXS

### Sprockets
- **Spec1**: Chain Pitch (#25, #35)
- **Spec2**: Tooth Count
- **Spec3**: Bore
- **Spec4**: Hub Style (Single Hub, Double Hub, Plate)

**Example**: `18t Aluminum Double Hub Sprocket (#35 Chain, 1/2" Hex Bore)`
- Spec1: #35
- Spec2: 18t
- Spec3: 1/2" Hex
- Spec4: Double Hub

### Electronics
- **Spec1**: Component Type (PDP, CANcoder, Pigeon, etc.)
- **Spec2**: Model (2.0, X60, X44, etc.)
- **Spec3**: Rating/Interface (Pre-Wired, 10A, etc.)
- **Spec4**: Additional specs (Powered by TalonFX, etc.)

**Example**: `CTR CANcoder (Pre-Wired)`
- Spec1: CANcoder
- Spec2:
- Spec3: Pre-Wired
- Spec4:

### Hardware
- **Spec1**: Type (Spacer, Tube Plug, Nut Strip, Clamp)
- **Spec2**: Size/Dimensions
- **Spec3**: Material (Aluminum, Steel, Plastic, Bronze)
- **Spec4**: Additional dimensions (Length, etc.)

## Data Extraction Patterns

### Product Code
Pattern: `(WCP-XXXX)`, `(217-XXXX)`, `(CTR-XXXX)`
```javascript
/\(([A-Z]{2,4}-\d+)\)/
```

### Price
Pattern: `+$XX.XX`
```javascript
/\+\$([0-9.]+)/
```

### Pack Quantity
Pattern: `(50-Pack)`, `(2-Pack)`
```javascript
/\((\d+)-Pack\)/i
```
Default: 1 if not specified

### Stock Status
Pattern: `In Stock`, `BackOrdered`, `Out of Stock`
**Note**: Stock status is IGNORED - all parts treated as available per requirements

## Output Format

Each part is imported as an 18-element array matching Google Sheets structure:

```javascript
[
  partID,           // Auto-generated: FAST-015, MOVE-013, etc.
  partName,         // Cleaned description
  category,         // Detected category
  subcategory,      // From CSV structure
  productCode,      // WCP-XXXX format
  spec1,            // Type-specific
  spec2,            // Type-specific
  spec3,            // Type-specific
  spec4,            // Type-specific
  quantityPer,      // Pack quantity or 1
  cost,             // Extracted price
  supplier,         // 'West Coast Products'
  orderLink,        // WCP URL
  location,         // Empty (filled manually)
  notes,            // Empty
  status,           // 'Active'
  dateAdded,        // Current date (YYYY-MM-DD)
  addedBy          // 'WCP Import'
]
```

## Import Statistics

The script tracks and reports:
- **Total Parts Processed**: Count of all part entries in CSV
- **Successfully Imported**: Parts added to Google Sheets
- **Duplicates Skipped**: Parts with existing product codes
- **Invalid/Skipped**: Parts with missing required data

### Category Breakdown
Shows count of parts imported per category:
```
Movement: 425
Fasteners: 72
Hardware: 27
Wiring, Cables, Connectors: 17
Electronics and Sensors: 14
Raw Stock: 11
Machining Tools: 1
```

### Warnings
The system generates warnings for:
- Missing product codes
- Parts with no specs extracted
- Unusual data patterns

### Sample Report
```
============================================================
WCP PARTS IMPORT REPORT
============================================================

OVERALL STATISTICS:
  Total Parts Processed: 593
  Successfully Imported: 567
  Duplicates Skipped: 24
  Invalid/Skipped: 2

CATEGORY BREAKDOWN:
  Movement: 425
  Fasteners: 72
  Hardware: 27
  Wiring, Cables, Connectors: 17
  Electronics and Sensors: 14
  Raw Stock: 11
  Machining Tools: 1

WARNINGS (87):
  - Line 237: No product code found - 1/2" Hex Bore Timing Pulleys
  - Line 431: No specs extracted for #25/#35 Combo Chain Breaker Tool
  ... and 85 more warnings

============================================================
IMPORT COMPLETE
============================================================
```

## Duplicate Detection

The system prevents duplicate imports by:
1. Fetching all existing product codes from Google Sheets before import
2. Checking each new part against the existing codes
3. Skipping parts that already exist
4. Counting and reporting skipped duplicates

This allows the script to be run multiple times safely - it will only import new parts.

## Error Handling

### Validation Checks
- **Product Code**: Required, must match pattern `XXX-NNNN`
- **Price**: Must be numeric and greater than 0
- **Part Name**: Cannot be empty after cleaning

### Graceful Failures
- Invalid parts are skipped with warnings
- Upload errors are caught and reported
- Script continues processing even if individual parts fail

## Performance

### Optimization Strategies
- **Batch Upload**: All parts uploaded in a single API call
- **Minimal API Calls**: Only 2 API calls total (fetch + append)
- **Efficient Regex**: Pre-compiled patterns for fast extraction
- **Memory Efficient**: Processes CSV line-by-line

### Typical Performance
- **757 CSV lines**: ~2-3 seconds to parse
- **567 parts**: ~1-2 seconds to upload
- **Total Time**: 3-5 seconds end-to-end

## Extending the System

### Adding New Categories
1. Update `CATEGORY_MAP` with new keywords
2. Update `CATEGORY_PREFIX` with new prefix
3. Add spec extraction function if needed
4. Update documentation

### Adding New Spec Extractors
1. Create new `extractXXXSpecs()` function
2. Add detection logic in `extractSpecs()`
3. Document extraction patterns above
4. Test with sample data

### Modifying CSV Format
If WCP changes their export format:
1. Update `parseCSV()` function
2. Adjust regex patterns in extraction functions
3. Test thoroughly with new format
4. Update documentation

## Troubleshooting

### "Authentication failed"
- Check credentials.json exists and is valid
- Verify service account has Sheets API access
- Ensure spreadsheet is shared with service account email

### "No parts to upload"
- All parts may be duplicates
- Check CSV file path is correct
- Verify CSV format matches expected structure

### "Upload failed"
- Check spreadsheet ID is correct
- Verify sheet name is "Parts"
- Ensure service account has edit permissions

### Incorrect Spec Extraction
- Check regex patterns in extraction functions
- Add console logging to debug specific parts
- Update patterns based on actual data

## Best Practices

1. **Backup First**: Export current Parts sheet before import
2. **Test Run**: Try importing a small CSV sample first
3. **Review Report**: Check warnings for extraction issues
4. **Verify Data**: Spot-check imported parts in Google Sheets
5. **Re-run Safe**: Script can be re-run - duplicates are skipped

## Maintenance

### Regular Tasks
- Review warnings after each import
- Improve spec extraction patterns based on warnings
- Update category keywords as new part types emerge
- Document any manual data fixes needed

### Future Improvements
- Add support for bulk updates (not just inserts)
- Implement dry-run mode for testing
- Add spec validation rules
- Create web interface for imports
- Support other supplier formats (AndyMark, REV, etc.)

## Support

For issues or questions:
1. Check warnings in import report
2. Review this documentation
3. Examine source code comments
4. Test with minimal CSV sample
5. Contact system maintainer

## Version History

**v1.0.0** - 2025-10-28
- Initial release
- Support for WCP CSV format
- 7 category detection
- 7 spec extraction patterns
- Comprehensive reporting
- Duplicate detection
- Batch upload optimization
