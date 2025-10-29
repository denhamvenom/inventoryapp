/**
 * WCP Parts Import Script
 * Parses WCP_Parts.csv and imports parts into Google Sheets Parts database
 * with intelligent spec extraction and category mapping.
 *
 * @author Denham Venom Robotics System
 * @date 2025-10-28
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { google } = require('googleapis');

// Configuration
const CREDENTIALS_PATH = '/mnt/c/Users/frc80/OneDrive/Documents/DVOM/credentials.json';
const CSV_PATH = '/mnt/c/Users/frc80/OneDrive/Documents/DVOM/Testing/WCP_Parts.csv';
const SPREADSHEET_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';
const SHEET_NAME = 'Parts';

// Category mapping based on keywords in part descriptions
const CATEGORY_MAP = {
  'Fasteners': ['bolt', 'screw', 'bhcs', 'shcs', 'phcs', 'shoulder', 'rivet', 'washer', 'nut'],
  'Movement': ['gear', 'spur', 'pocketed', 'timing pulley', 'sprocket', '#25', '#35', 'bearing', 'bushing', 'gear rack', 'kraken', 'motor', 'chain', 'belt', 'pulley'],
  'Electronics and Sensors': ['pdp', 'ctre', 'cancoder', 'pigeon', 'canivore', 'canrange', 'candle', 'candi', 'sensor', 'encoder', 'mag encoder', 'throughbore'],
  'Raw Stock': ['shaft stock', 'carbon fiber', 'srpp', 'tubing'],
  'Wiring, Cables, Connectors': ['wire', 'cable carrier'],
  'Hardware': ['spacer', 'tube plug', 'nut strip', 'clamp'],
  'Machining Tools': ['cnc', 'workholding', 'chain breaker', 'breaker pin']
};

// Category prefix mapping for Part ID generation
const CATEGORY_PREFIX = {
  'Fasteners': 'FAST',
  'Movement': 'MOVE',
  'Electronics and Sensors': 'ELEC',
  'Raw Stock': 'RAWM',
  'Wiring, Cables, Connectors': 'WIRE',
  'Hardware': 'HARD',
  'Machining Tools': 'TOOL'
};

// Import statistics
const stats = {
  totalProcessed: 0,
  successfullyImported: 0,
  duplicatesSkipped: 0,
  invalidSkipped: 0,
  categoryBreakdown: {},
  warnings: [],
  errors: []
};

/**
 * Authenticate with Google Sheets API
 */
async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

/**
 * Get existing parts from Google Sheets to check for duplicates and get max IDs
 */
async function getExistingParts(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E`,
    });

    const existingParts = response.data.values || [];
    const productCodes = new Set();
    const maxIDs = {};

    existingParts.forEach(row => {
      const partID = row[0];
      const productCode = row[4];

      if (productCode) {
        productCodes.add(productCode);
      }

      if (partID) {
        const match = partID.match(/^([A-Z]+)-(\d+)$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2]);
          maxIDs[prefix] = Math.max(maxIDs[prefix] || 0, num);
        }
      }
    });

    return { productCodes, maxIDs };
  } catch (error) {
    console.error('Error fetching existing parts:', error.message);
    return { productCodes: new Set(), maxIDs: {} };
  }
}

/**
 * Parse CSV file with hierarchical structure
 */
function parseCSV() {
  const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(fileContent, {
    skip_empty_lines: false,
    relax_column_count: true
  });

  const parsedData = [];
  let currentCategory = '';
  let currentCategoryURL = '';
  let currentSubcategory = '';

  records.forEach((row, index) => {
    // Skip header row
    if (index === 0) return;

    const col1 = (row[0] || '').trim();
    const col2 = (row[1] || '').trim();
    const col3 = (row[2] || '').trim();
    const col4 = (row[3] || '').trim();

    // Category line (Website: URL in col2)
    if (col2.includes('Website:')) {
      const parts = col2.split('Website:');
      currentCategory = parts[0].trim();
      currentCategoryURL = parts[1].trim();
      currentSubcategory = '';
    }
    // Subcategory line (text in col3, nothing in col4)
    else if (col3 && !col4) {
      currentSubcategory = col3.trim();
    }
    // Part line (data in col4)
    else if (col4) {
      parsedData.push({
        category: currentCategory,
        categoryURL: currentCategoryURL,
        subcategory: currentSubcategory,
        rawData: col4.trim(),
        lineNumber: index + 1
      });
    }
  });

  return parsedData;
}

/**
 * Extract product code from raw part data
 * WCP product codes are in format (WCP-XXXX), (217-XXXX), (CTR-XXXX), etc.
 */
function extractProductCode(rawData) {
  const match = rawData.match(/\(([A-Z]{2,4}-\d+)\)/);
  return match ? match[1] : null;
}

/**
 * Extract price from raw part data
 */
function extractPrice(rawData) {
  const match = rawData.match(/\+\$([0-9.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Extract pack quantity from raw part data
 */
function extractPackQuantity(rawData) {
  const match = rawData.match(/\((\d+)-Pack\)/i);
  return match ? parseInt(match[1]) : 1;
}

/**
 * Clean part name by removing product code, price, and stock status
 */
function cleanPartName(rawData) {
  let name = rawData;

  // Remove product code (WCP-XXXX) or (217-XXXX) etc
  name = name.replace(/\([A-Z0-9-]+\)/g, '');

  // Remove price +$XX.XX
  name = name.replace(/\+\$[0-9.]+/g, '');

  // Remove stock status
  name = name.replace(/In Stock|BackOrdered|Out of Stock/g, '');

  // Remove special character separator
  name = name.replace(/�/g, ' ');

  // Clean up extra whitespace
  name = name.trim().replace(/\s+/g, ' ');

  return name;
}

/**
 * Detect category based on part description
 */
function detectCategory(partName, subcategory) {
  const searchText = `${partName} ${subcategory}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // Default to Movement for WCP (mostly drivetrain parts)
  return 'Movement';
}

/**
 * Extract specifications for Fasteners
 */
function extractFastenerSpecs(partName) {
  const specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  // Spec1: Type
  if (/bhcs/i.test(partName)) specs.spec1 = 'BHCS';
  else if (/shcs/i.test(partName)) specs.spec1 = 'SHCS';
  else if (/phcs/i.test(partName)) specs.spec1 = 'PHCS';
  else if (/shoulder bolt/i.test(partName)) specs.spec1 = 'Shoulder Bolt';
  else if (/rivet/i.test(partName)) specs.spec1 = 'Rivet';
  else if (/washer/i.test(partName)) specs.spec1 = 'Washer';

  // Spec2: Thread Size
  const threadMatch = partName.match(/#(\d+-\d+)|(\d+\/\d+)-(\d+)/);
  if (threadMatch) {
    if (threadMatch[1]) {
      specs.spec2 = `#${threadMatch[1]}`;
    } else if (threadMatch[2] && threadMatch[3]) {
      specs.spec2 = `${threadMatch[2]}-${threadMatch[3]}`;
    }
  }

  // Spec3: Length
  const lengthMatch = partName.match(/(\d+(?:\.\d+)?)"?\s*L/i) || partName.match(/x\s*(\d+(?:\.\d+)?)"?\s*L/i);
  if (lengthMatch) {
    specs.spec3 = `${lengthMatch[1]}"`;
  }

  // Spec4: Material
  if (/black oxide/i.test(partName)) specs.spec4 = 'Black Oxide';
  else if (/stainless/i.test(partName)) specs.spec4 = 'Stainless';
  else if (/steel/i.test(partName)) specs.spec4 = 'Steel';
  else if (/aluminum/i.test(partName)) specs.spec4 = 'Aluminum';

  return specs;
}

/**
 * Extract specifications for Gears
 */
function extractGearSpecs(partName) {
  const specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  // Spec1: Gear Type
  if (/pocketed/i.test(partName)) specs.spec1 = 'Pocketed Spur';
  else if (/spur/i.test(partName)) specs.spec1 = 'Spur';
  else if (/motor gear/i.test(partName)) specs.spec1 = 'Motor Gear';

  // Spec2: Tooth Count
  const toothMatch = partName.match(/(\d+)t\s/i);
  if (toothMatch) {
    specs.spec2 = `${toothMatch[1]}t`;
  }

  // Spec3: Bore
  const boreMatch = partName.match(/(\d+\/\d+"\s*(?:Hex|Rounded Hex|Round))/i) ||
                    partName.match(/(\d+mm\s*(?:SplineXS|SplineXL|Key|Round))/i) ||
                    partName.match(/(Falcon|RS\d+)\s*Bore/i);
  if (boreMatch) {
    specs.spec3 = boreMatch[1];
  }

  // Spec4: Diametral Pitch
  const dpMatch = partName.match(/(\d+)\s*DP/i);
  if (dpMatch) {
    specs.spec4 = `${dpMatch[1]} DP`;
  }

  return specs;
}

/**
 * Extract specifications for Bearings
 */
function extractBearingSpecs(partName) {
  const specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  // Spec1: Type
  if (/flanged/i.test(partName)) specs.spec1 = 'Flanged';
  else if (/radial/i.test(partName)) specs.spec1 = 'Radial';
  else if (/x-contact/i.test(partName)) specs.spec1 = 'X-Contact';
  else if (/thrust/i.test(partName)) specs.spec1 = 'Thrust';
  else if (/needle/i.test(partName)) specs.spec1 = 'Needle';
  else if (/metric/i.test(partName)) specs.spec1 = 'Metric';

  // Spec2: ID (Inside Diameter) - handle formats like .302", 10.25mm, 0.250"
  const idMatch = partName.match(/(?:^|\s)(\d*\.?\d+(?:mm|"))\s*(?:\([^)]*\))?\s*ID/i);
  if (idMatch) {
    specs.spec2 = idMatch[1];
  }

  // Spec3: OD (Outside Diameter)
  const odMatch = partName.match(/(\d+(?:\.\d+)?(?:mm|"))\s*OD/i);
  if (odMatch) {
    specs.spec3 = odMatch[1];
  }

  // Spec4: WD (Width)
  const wdMatch = partName.match(/(\d+(?:\.\d+)?(?:mm|"))\s*WD/i);
  if (wdMatch) {
    specs.spec4 = wdMatch[1];
  }

  return specs;
}

/**
 * Extract specifications for Timing Components (Pulleys and Belts)
 */
function extractTimingSpecs(partName) {
  const specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  // Spec1: Type
  if (/GT2|GT3/i.test(partName)) specs.spec1 = 'GT2/GT3';
  else if (/HTD/i.test(partName)) specs.spec1 = 'HTD';

  // For Pulleys
  if (/pulley/i.test(partName)) {
    // Spec2: Tooth Count
    const toothMatch = partName.match(/(\d+)t\s/i);
    if (toothMatch) {
      specs.spec2 = `${toothMatch[1]}t`;
    }

    // Spec3: Width
    const widthMatch = partName.match(/(\d+mm)\s*Wide/i);
    if (widthMatch) {
      specs.spec3 = widthMatch[1];
    }

    // Spec4: Bore
    const boreMatch = partName.match(/(\d+\/\d+"\s*Hex|Falcon|RS\d+|SplineXS|Key)\s*Bore/i);
    if (boreMatch) {
      specs.spec4 = boreMatch[1];
    }
  }
  // For Belts
  else if (/belt/i.test(partName)) {
    // Spec2: Tooth Count / Length
    const toothMatch = partName.match(/(\d+)t\s/i);
    if (toothMatch) {
      specs.spec2 = `${toothMatch[1]}t`;
    }

    // Spec3: Width
    const widthMatch = partName.match(/(\d+mm)\s*Wide/i);
    if (widthMatch) {
      specs.spec3 = widthMatch[1];
    }

    // Spec4: Pitch
    const pitchMatch = partName.match(/(GT2|HTD)\s*(\d+mm)/i);
    if (pitchMatch) {
      specs.spec4 = `${pitchMatch[1]} ${pitchMatch[2]}`;
    }
  }

  return specs;
}

/**
 * Extract specifications for Sprockets
 */
function extractSprocketSpecs(partName) {
  const specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  // Spec1: Chain Pitch
  if (/#25/i.test(partName)) specs.spec1 = '#25';
  else if (/#35/i.test(partName)) specs.spec1 = '#35';

  // Spec2: Tooth Count
  const toothMatch = partName.match(/(\d+)t\s/i);
  if (toothMatch) {
    specs.spec2 = `${toothMatch[1]}t`;
  }

  // Spec3: Bore
  const boreMatch = partName.match(/(\d+\/\d+"\s*(?:Hex|Rounded Hex)|SplineXL|SplineXS)\s*Bore/i);
  if (boreMatch) {
    specs.spec3 = boreMatch[1];
  }

  // Spec4: Hub Style
  if (/double hub/i.test(partName)) specs.spec4 = 'Double Hub';
  else if (/single hub/i.test(partName)) specs.spec4 = 'Single Hub';
  else if (/plate/i.test(partName)) specs.spec4 = 'Plate';

  return specs;
}

/**
 * Extract specifications for Electronics
 */
function extractElectronicsSpecs(partName) {
  const specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  // Spec1: Component Type
  if (/pdp/i.test(partName)) specs.spec1 = 'PDP';
  else if (/breaker/i.test(partName)) specs.spec1 = 'Breaker';
  else if (/cancoder/i.test(partName)) specs.spec1 = 'CANcoder';
  else if (/pigeon/i.test(partName)) specs.spec1 = 'Pigeon';
  else if (/canivore/i.test(partName)) specs.spec1 = 'CANivore';
  else if (/canrange/i.test(partName)) specs.spec1 = 'CANrange';
  else if (/candle/i.test(partName)) specs.spec1 = 'CANdle';
  else if (/candi/i.test(partName)) specs.spec1 = 'CANdi';
  else if (/encoder/i.test(partName)) specs.spec1 = 'Encoder';
  else if (/throughbore/i.test(partName)) specs.spec1 = 'ThroughBore';

  // Spec2: Model
  const modelMatch = partName.match(/(2\.0|V2)/i) || partName.match(/(X60|X44)/i);
  if (modelMatch) {
    specs.spec2 = modelMatch[1];
  }

  // Spec3: Rating/Interface for breakers and other components
  const ratingMatch = partName.match(/(\d+A)/i);
  if (ratingMatch) {
    specs.spec3 = ratingMatch[1];
  } else if (/pre-wired/i.test(partName)) {
    specs.spec3 = 'Pre-Wired';
  }

  // Spec4: Additional specs
  if (/powered by/i.test(partName)) {
    const poweredMatch = partName.match(/Powered by\s+([A-Za-z0-9]+)/i);
    if (poweredMatch) {
      specs.spec4 = `Powered by ${poweredMatch[1]}`;
    }
  }

  return specs;
}

/**
 * Extract specifications for Hardware
 */
function extractHardwareSpecs(partName) {
  const specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  // Spec1: Type
  if (/spacer/i.test(partName)) specs.spec1 = 'Spacer';
  else if (/tube plug/i.test(partName)) specs.spec1 = 'Tube Plug';
  else if (/nut strip/i.test(partName)) specs.spec1 = 'Nut Strip';
  else if (/clamp/i.test(partName)) specs.spec1 = 'Clamp';

  // Spec2: Size/Dimensions (ID/OD for spacers, size for others)
  const sizeMatch = partName.match(/(\d+\/\d+"|#\d+|\d+mm)/i);
  if (sizeMatch) {
    specs.spec2 = sizeMatch[1];
  }

  // Spec3: Material
  if (/aluminum/i.test(partName)) specs.spec3 = 'Aluminum';
  else if (/steel/i.test(partName)) specs.spec3 = 'Steel';
  else if (/plastic/i.test(partName)) specs.spec3 = 'Plastic';
  else if (/bronze/i.test(partName)) specs.spec3 = 'Bronze';

  // Spec4: Additional dimensions
  const lengthMatch = partName.match(/(\d+(?:\.\d+)?"\s*(?:L|Long|Length))/i);
  if (lengthMatch) {
    specs.spec4 = lengthMatch[1];
  }

  return specs;
}

/**
 * Extract specifications based on part category
 */
function extractSpecs(partName, category) {
  let specs = { spec1: '', spec2: '', spec3: '', spec4: '' };

  const lowerName = partName.toLowerCase();

  if (category === 'Fasteners') {
    specs = extractFastenerSpecs(partName);
  } else if (category === 'Movement') {
    if (lowerName.includes('bearing')) {
      specs = extractBearingSpecs(partName);
    } else if (lowerName.includes('gear')) {
      specs = extractGearSpecs(partName);
    } else if (lowerName.includes('pulley') || lowerName.includes('timing belt')) {
      specs = extractTimingSpecs(partName);
    } else if (lowerName.includes('sprocket')) {
      specs = extractSprocketSpecs(partName);
    }
  } else if (category === 'Electronics and Sensors') {
    specs = extractElectronicsSpecs(partName);
  } else if (category === 'Hardware') {
    specs = extractHardwareSpecs(partName);
  }

  return specs;
}

/**
 * Generate Part ID based on category and current max ID
 */
function generatePartID(category, maxIDs) {
  const prefix = CATEGORY_PREFIX[category] || 'MISC';
  const currentMax = maxIDs[prefix] || 0;
  const newNum = currentMax + 1;
  maxIDs[prefix] = newNum;
  return `${prefix}-${String(newNum).padStart(3, '0')}`;
}

/**
 * Process a single part entry
 */
function processPart(partData, productCodes, maxIDs) {
  stats.totalProcessed++;

  const productCode = extractProductCode(partData.rawData);
  const partName = cleanPartName(partData.rawData);
  const price = extractPrice(partData.rawData);
  const packQty = extractPackQuantity(partData.rawData);

  // Validation
  if (!productCode) {
    stats.invalidSkipped++;
    stats.warnings.push(`Line ${partData.lineNumber}: No product code found - ${partData.rawData.substring(0, 50)}`);
    return null;
  }

  // Check for duplicates
  if (productCodes.has(productCode)) {
    stats.duplicatesSkipped++;
    return null;
  }

  // Detect category
  const category = detectCategory(partName, partData.subcategory);

  // Extract specs
  const specs = extractSpecs(partName, category);

  // Warn if all specs are empty
  if (!specs.spec1 && !specs.spec2 && !specs.spec3 && !specs.spec4) {
    stats.warnings.push(`Line ${partData.lineNumber}: No specs extracted for ${partName}`);
  }

  // Generate Part ID
  const partID = generatePartID(category, maxIDs);

  // Track category stats
  stats.categoryBreakdown[category] = (stats.categoryBreakdown[category] || 0) + 1;

  // Mark as imported
  productCodes.add(productCode);
  stats.successfullyImported++;

  // Return part data array (18 elements to match Google Sheets structure)
  return [
    partID,                           // Part ID
    partName,                         // Part Name
    category,                         // Category
    partData.subcategory,             // Subcategory
    productCode,                      // Product Code
    specs.spec1,                      // Spec 1
    specs.spec2,                      // Spec 2
    specs.spec3,                      // Spec 3
    specs.spec4,                      // Spec 4
    packQty,                          // Quantity Per
    price,                            // Cost
    'West Coast Products',            // Supplier
    partData.categoryURL,             // Order Link
    '',                               // Location (empty)
    '',                               // Notes (empty)
    'Active',                         // Status
    new Date().toISOString().split('T')[0],  // Date Added
    'WCP Import'                      // Added By
  ];
}

/**
 * Upload parts to Google Sheets in batches
 */
async function uploadParts(sheets, partsData) {
  if (partsData.length === 0) {
    console.log('No parts to upload.');
    return;
  }

  console.log(`\nUploading ${partsData.length} parts to Google Sheets...`);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:R`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: partsData
      }
    });

    console.log('Upload successful!');
  } catch (error) {
    stats.errors.push(`Upload error: ${error.message}`);
    console.error('Upload failed:', error.message);
  }
}

/**
 * Generate and display import report
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('WCP PARTS IMPORT REPORT');
  console.log('='.repeat(60));

  console.log('\nOVERALL STATISTICS:');
  console.log(`  Total Parts Processed: ${stats.totalProcessed}`);
  console.log(`  Successfully Imported: ${stats.successfullyImported}`);
  console.log(`  Duplicates Skipped: ${stats.duplicatesSkipped}`);
  console.log(`  Invalid/Skipped: ${stats.invalidSkipped}`);

  console.log('\nCATEGORY BREAKDOWN:');
  Object.entries(stats.categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });

  if (stats.warnings.length > 0) {
    console.log(`\nWARNINGS (${stats.warnings.length}):`);
    stats.warnings.slice(0, 10).forEach(warning => {
      console.log(`  - ${warning}`);
    });
    if (stats.warnings.length > 10) {
      console.log(`  ... and ${stats.warnings.length - 10} more warnings`);
    }
  }

  if (stats.errors.length > 0) {
    console.log(`\nERRORS (${stats.errors.length}):`);
    stats.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution function
 */
async function main() {
  console.log('Starting WCP Parts Import...\n');

  try {
    // Authenticate
    console.log('Authenticating with Google Sheets...');
    const auth = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Authentication successful.');

    // Get existing parts
    console.log('Fetching existing parts from database...');
    const { productCodes, maxIDs } = await getExistingParts(sheets);
    console.log(`Found ${productCodes.size} existing product codes.`);
    console.log('Current max IDs:', maxIDs);

    // Parse CSV
    console.log('\nParsing WCP_Parts.csv...');
    const parsedData = parseCSV();
    console.log(`Parsed ${parsedData.length} part entries from CSV.`);

    // Process parts
    console.log('\nProcessing parts...');
    const partsToImport = [];
    parsedData.forEach(partData => {
      const processedPart = processPart(partData, productCodes, maxIDs);
      if (processedPart) {
        partsToImport.push(processedPart);
      }
    });

    // Upload to Google Sheets
    if (partsToImport.length > 0) {
      await uploadParts(sheets, partsToImport);
    }

    // Generate report
    generateReport();

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the import
main();
