/**
 * Data Population Script for Denham Venom Parts System
 * Populates Google Sheets with sample data from CSV files
 * 
 * Usage: node setup/populateData.js
 * 
 * Prerequisites:
 * - Run npm run setup first to create spreadsheets
 * - Spreadsheet IDs must be in spreadsheet-ids.json
 * - CSV files must exist in /data directory
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Load configuration and spreadsheet IDs
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const idsPath = path.join(__dirname, 'spreadsheet-ids.json');
if (!fs.existsSync(idsPath)) {
  console.error('Error: spreadsheet-ids.json not found!');
  console.error('Please run "npm run setup" first to create the spreadsheets.');
  process.exit(1);
}
const spreadsheetIds = JSON.parse(fs.readFileSync(idsPath, 'utf8'));

// Load credentials
const credentialsPath = path.join(__dirname, '..', 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Read and parse CSV file
 * @param {string} filename - Name of CSV file in /data directory
 * @returns {Array} Parsed CSV data
 */
function readCSV(filename) {
  const csvPath = path.join(__dirname, '..', 'data', filename);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: ${filename} not found at ${csvPath}`);
    return [];
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  return records;
}

/**
 * Convert array of objects to 2D array for Google Sheets
 * @param {Array} data - Array of objects from CSV
 * @param {Array} headers - Column headers
 * @returns {Array} 2D array of values
 */
function dataToRows(data, headers) {
  return data.map(record => 
    headers.map(header => record[header] || '')
  );
}

/**
 * Populate a sheet with data
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {string} sheetName - Name of the sheet
 * @param {Array} data - 2D array of values
 */
async function populateSheet(spreadsheetId, sheetName, data) {
  if (!data || data.length === 0) {
    console.log(`  - No data to populate for ${sheetName}`);
    return;
  }

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: data
      }
    });

    console.log(`  - Populated ${sheetName} with ${data.length} rows`);
  } catch (error) {
    console.error(`Error populating ${sheetName}:`, error.message);
    throw error;
  }
}

/**
 * Add VLOOKUP formulas to Orders sheet
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {string} partsDirectoryId - The Parts Directory spreadsheet ID
 */
async function addOrderFormulas(spreadsheetId, partsDirectoryId) {
  try {
    // Get the current data to determine how many rows exist
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Orders!A:A'
    });

    const numRows = response.data.values ? response.data.values.length : 1;
    
    if (numRows <= 1) {
      console.log('  - No orders to add formulas to');
      return;
    }

    // Create formula for each row (starting from row 2)
    const formulas = [];
    for (let row = 2; row <= numRows; row++) {
      formulas.push([
        '', // Order # (will be filled manually or by form)
        `=TODAY()`, // Date
        '', // Student Name
        '', // Part ID
        `=IFERROR(VLOOKUP(D${row},IMPORTRANGE("${partsDirectoryId}","Parts!A:B"),2,FALSE),"")`, // Part Name
        `=IFERROR(VLOOKUP(D${row},IMPORTRANGE("${partsDirectoryId}","Parts!A:C"),3,FALSE),"")`, // Category
        '', // Quantity
        '', // Priority
        `=IFERROR(VLOOKUP(D${row},IMPORTRANGE("${partsDirectoryId}","Parts!A:I"),9,FALSE),0)`, // Unit Cost
        `=IF(G${row}="","",G${row}*I${row})`, // Total Cost
        'Requested', // Status
        '', // Notes
        '' // Monday ID
      ]);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Orders!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: formulas
      }
    });

    console.log('  - Added VLOOKUP formulas to Orders sheet');
    console.log('  - Note: You may need to grant access to IMPORTRANGE when first opening the sheet');
  } catch (error) {
    console.error('Error adding formulas:', error.message);
  }
}

/**
 * Validate data integrity
 * @param {Object} data - Object containing all data arrays
 * @returns {boolean} True if validation passes
 */
function validateData(data) {
  console.log('\nValidating data integrity...');
  let isValid = true;

  // Check that all categories in parts.csv exist in categories.csv
  const validCategories = new Set(data.categories.map(cat => cat['Category Name']));
  const partCategories = new Set(data.parts.map(part => part['Category']));

  for (const category of partCategories) {
    if (!validCategories.has(category)) {
      console.error(`  ERROR: Invalid category "${category}" found in parts.csv`);
      isValid = false;
    }
  }

  // Check for duplicate Part IDs
  const partIds = data.parts.map(part => part['Part ID']);
  const duplicates = partIds.filter((id, index) => partIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    console.error(`  ERROR: Duplicate Part IDs found: ${duplicates.join(', ')}`);
    isValid = false;
  }

  // Check that all parts have required fields
  const requiredPartFields = ['Part ID', 'Part Name', 'Category', 'Cost', 'Supplier'];
  for (const part of data.parts) {
    for (const field of requiredPartFields) {
      if (!part[field]) {
        console.error(`  ERROR: Part "${part['Part Name']}" missing required field "${field}"`);
        isValid = false;
      }
    }
  }

  if (isValid) {
    console.log('  All validation checks passed!');
  }

  return isValid;
}

/**
 * Generate summary statistics
 * @param {Object} data - Object containing all data arrays
 */
function printSummary(data) {
  console.log('\n========================================');
  console.log('Data Summary');
  console.log('========================================');
  console.log(`Categories: ${data.categories.length}`);
  console.log(`Parts: ${data.parts.length}`);
  console.log(`Students: ${data.students.length}`);
  console.log();

  // Parts by category
  console.log('Parts by Category:');
  const partsByCategory = {};
  for (const part of data.parts) {
    const category = part['Category'];
    partsByCategory[category] = (partsByCategory[category] || 0) + 1;
  }
  
  for (const [category, count] of Object.entries(partsByCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count} parts`);
  }
  console.log();

  // Students by subteam
  console.log('Students by Subteam:');
  const studentsBySubteam = {};
  for (const student of data.students) {
    const subteam = student['Subteam'];
    studentsBySubteam[subteam] = (studentsBySubteam[subteam] || 0) + 1;
  }
  
  for (const [subteam, count] of Object.entries(studentsBySubteam).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${subteam}: ${count} students`);
  }
  console.log();

  // Price statistics
  const prices = data.parts.map(part => parseFloat(part['Cost']) || 0);
  const totalValue = prices.reduce((sum, price) => sum + price, 0);
  const avgPrice = totalValue / prices.length;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices.filter(p => p > 0));

  console.log('Price Statistics:');
  console.log(`  Total catalog value: $${totalValue.toFixed(2)}`);
  console.log(`  Average part cost: $${avgPrice.toFixed(2)}`);
  console.log(`  Most expensive part: $${maxPrice.toFixed(2)}`);
  console.log(`  Least expensive part: $${minPrice.toFixed(2)}`);
  console.log();
}

/**
 * Main execution function
 */
async function main() {
  console.log('========================================');
  console.log('Denham Venom Parts System Data Loader');
  console.log('========================================\n');

  try {
    // Read CSV files
    console.log('Reading CSV files...');
    const categoriesData = readCSV('categories.csv');
    const partsData = readCSV('parts.csv');
    const studentsData = readCSV('students.csv');

    const data = {
      categories: categoriesData,
      parts: partsData,
      students: studentsData
    };

    console.log(`  - Loaded ${categoriesData.length} categories`);
    console.log(`  - Loaded ${partsData.length} parts`);
    console.log(`  - Loaded ${studentsData.length} students`);
    console.log();

    // Validate data
    if (!validateData(data)) {
      console.error('\nValidation failed! Please fix the errors and try again.');
      process.exit(1);
    }

    // Print summary
    printSummary(data);

    // Populate Parts Directory
    console.log('Populating Parts Directory spreadsheet...');
    
    const categoriesHeaders = config.spreadsheets.partsDirectory.sheets
      .find(s => s.name === 'Categories').headers;
    const categoriesRows = dataToRows(categoriesData, categoriesHeaders);
    await populateSheet(spreadsheetIds.partsDirectory, 'Categories', categoriesRows);

    const partsHeaders = config.spreadsheets.partsDirectory.sheets
      .find(s => s.name === 'Parts').headers;
    const partsRows = dataToRows(partsData, partsHeaders);
    await populateSheet(spreadsheetIds.partsDirectory, 'Parts', partsRows);

    console.log();

    // Populate Parts Orders
    console.log('Populating Parts Orders spreadsheet...');
    
    const studentsHeaders = config.spreadsheets.partsOrders.sheets
      .find(s => s.name === 'Students').headers;
    const studentsRows = dataToRows(studentsData, studentsHeaders);
    await populateSheet(spreadsheetIds.partsOrders, 'Students', studentsRows);

    console.log();

    // Add formulas to Orders sheet
    console.log('Setting up Orders sheet formulas...');
    await addOrderFormulas(spreadsheetIds.partsOrders, spreadsheetIds.partsDirectory);

    console.log();
    console.log('========================================');
    console.log('Data Population Complete!');
    console.log('========================================\n');
    console.log('Spreadsheet URLs:');
    console.log(`Parts Directory: https://docs.google.com/spreadsheets/d/${spreadsheetIds.partsDirectory}`);
    console.log(`Parts Orders: https://docs.google.com/spreadsheets/d/${spreadsheetIds.partsOrders}\n`);
    console.log('Next steps:');
    console.log('1. Open the spreadsheets and verify the data');
    console.log('2. Grant IMPORTRANGE access when prompted (click "Allow access")');
    console.log('3. Update your Apps Script Code.js with the spreadsheet IDs');
    console.log('4. Run "clasp push" to deploy your code');
    console.log('5. Run "clasp deploy" to create the web app\n');

  } catch (error) {
    console.error('Error during data population:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
