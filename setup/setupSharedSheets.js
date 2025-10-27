/**
 * Setup Script for Pre-Created Google Sheets
 * Sets up the Denham Venom Parts System spreadsheets
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Spreadsheet IDs
const PARTS_DIRECTORY_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';
const PARTS_ORDERS_ID = '1f-4T0wMjLQKnA-dbFMgUDRKnSuwi0kjdSl91MuRHpeQ';

// LSU Colors
const LSU_PURPLE = { red: 0.275, green: 0.114, blue: 0.486 }; // #461D7C
const LSU_GOLD = { red: 0.992, green: 0.816, blue: 0.137 }; // #FDD023

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
 * Setup Parts Directory Spreadsheet
 */
async function setupPartsDirectory() {
  console.log('\nSetting up Parts Directory spreadsheet...');

  const requests = [];

  // Get current sheets
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: PARTS_DIRECTORY_ID
  });

  const currentSheets = spreadsheet.data.sheets;
  const sheet1Id = currentSheets[0].properties.sheetId;

  // Rename first sheet to "Parts"
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: sheet1Id,
        title: 'Parts'
      },
      fields: 'title'
    }
  });

  // Add "Categories" sheet
  requests.push({
    addSheet: {
      properties: {
        title: 'Categories',
        gridProperties: {
          rowCount: 20,
          columnCount: 3
        }
      }
    }
  });

  // Execute sheet structure changes
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: PARTS_DIRECTORY_ID,
    requestBody: { requests }
  });

  console.log('Created sheet tabs: Parts, Categories');

  // Add headers and data to Parts sheet
  const partsHeaders = [[
    'Part ID', 'Part Name', 'Category', 'Subcategory', 'Type',
    'Size/Spec 1', 'Spec 2', 'Quantity Per', 'Cost', 'Supplier',
    'Order Link', 'Location/Bin', 'Notes', 'Status', 'Date Added', 'Added By'
  ]];

  await sheets.spreadsheets.values.update({
    spreadsheetId: PARTS_DIRECTORY_ID,
    range: 'Parts!A1:P1',
    valueInputOption: 'RAW',
    requestBody: { values: partsHeaders }
  });

  console.log('Added Parts headers');

  // Add Categories data
  const categoriesData = [
    ['Category Name', 'Code', 'Sort Order'],
    ['Fasteners', 'FAST', 1],
    ['Electronics and Sensors', 'ELEC', 2],
    ['Raw Stock', 'STOCK', 3],
    ['Movement', 'MOVE', 4],
    ['Build Site Equipment', 'BSITE', 5],
    ['Pneumatics', 'PNEU', 6],
    ['Business, Outreach, Media', 'BUSI', 7],
    ['Machining Tools', 'MACH', 8],
    ['Safety Equipment', 'SAFE', 9],
    ['Wiring, Cables, Connectors', 'WIRE', 10]
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: PARTS_DIRECTORY_ID,
    range: 'Categories!A1:C11',
    valueInputOption: 'RAW',
    requestBody: { values: categoriesData }
  });

  console.log('Added Categories data');

  // Format headers
  const formatRequests = [
    // Parts sheet: Freeze header row
    {
      updateSheetProperties: {
        properties: {
          sheetId: sheet1Id,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    // Parts sheet: Format header row
    {
      repeatCell: {
        range: {
          sheetId: sheet1Id,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: LSU_PURPLE,
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true
            },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    }
  ];

  // Get Categories sheet ID
  const updatedSpreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: PARTS_DIRECTORY_ID
  });
  const categoriesSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Categories');
  const categoriesSheetId = categoriesSheet.properties.sheetId;

  // Categories sheet: Freeze header row and format
  formatRequests.push(
    {
      updateSheetProperties: {
        properties: {
          sheetId: categoriesSheetId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    {
      repeatCell: {
        range: {
          sheetId: categoriesSheetId,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: LSU_PURPLE,
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true
            },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    }
  );

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: PARTS_DIRECTORY_ID,
    requestBody: { requests: formatRequests }
  });

  console.log('Applied formatting to Parts Directory');
}

/**
 * Setup Parts Orders Spreadsheet
 */
async function setupPartsOrders() {
  console.log('\nSetting up Parts Orders spreadsheet...');

  const requests = [];

  // Get current sheets
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: PARTS_ORDERS_ID
  });

  const currentSheets = spreadsheet.data.sheets;
  const sheet1Id = currentSheets[0].properties.sheetId;

  // Rename first sheet to "Orders"
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: sheet1Id,
        title: 'Orders'
      },
      fields: 'title'
    }
  });

  // Add "Students" sheet
  requests.push({
    addSheet: {
      properties: {
        title: 'Students',
        gridProperties: {
          rowCount: 50,
          columnCount: 3
        }
      }
    }
  });

  // Add "New Parts" sheet
  requests.push({
    addSheet: {
      properties: {
        title: 'New Parts',
        gridProperties: {
          rowCount: 50,
          columnCount: 8
        }
      }
    }
  });

  // Execute sheet structure changes
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: PARTS_ORDERS_ID,
    requestBody: { requests }
  });

  console.log('Created sheet tabs: Orders, Students, New Parts');

  // Add headers to Orders sheet
  const ordersHeaders = [[
    'Order #', 'Date', 'Student Name', 'Part ID', 'Part Name', 'Category',
    'Quantity Requested', 'Priority', 'Unit Cost', 'Total Cost', 'Status', 'Notes', 'Monday ID'
  ]];

  await sheets.spreadsheets.values.update({
    spreadsheetId: PARTS_ORDERS_ID,
    range: 'Orders!A1:M1',
    valueInputOption: 'RAW',
    requestBody: { values: ordersHeaders }
  });

  console.log('Added Orders headers');

  // Add headers to Students sheet
  const studentsHeaders = [['Name', 'Subteam', 'Active']];

  await sheets.spreadsheets.values.update({
    spreadsheetId: PARTS_ORDERS_ID,
    range: 'Students!A1:C1',
    valueInputOption: 'RAW',
    requestBody: { values: studentsHeaders }
  });

  console.log('Added Students headers');

  // Add headers to New Parts sheet
  const newPartsHeaders = [[
    'Date', 'Student Name', 'Part Name', 'Category', 'Estimated Cost',
    'Where to Buy', 'Link', 'Status'
  ]];

  await sheets.spreadsheets.values.update({
    spreadsheetId: PARTS_ORDERS_ID,
    range: 'New Parts!A1:H1',
    valueInputOption: 'RAW',
    requestBody: { values: newPartsHeaders }
  });

  console.log('Added New Parts headers');

  // Get sheet IDs for formatting
  const updatedSpreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: PARTS_ORDERS_ID
  });

  const ordersSheetId = sheet1Id;
  const studentsSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'Students');
  const newPartsSheet = updatedSpreadsheet.data.sheets.find(s => s.properties.title === 'New Parts');

  // Format all three sheets
  const formatRequests = [];

  // Orders sheet
  formatRequests.push(
    {
      updateSheetProperties: {
        properties: {
          sheetId: ordersSheetId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    {
      repeatCell: {
        range: {
          sheetId: ordersSheetId,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: LSU_PURPLE,
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true
            },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    }
  );

  // Students sheet
  formatRequests.push(
    {
      updateSheetProperties: {
        properties: {
          sheetId: studentsSheet.properties.sheetId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    {
      repeatCell: {
        range: {
          sheetId: studentsSheet.properties.sheetId,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: LSU_PURPLE,
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true
            },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    }
  );

  // New Parts sheet
  formatRequests.push(
    {
      updateSheetProperties: {
        properties: {
          sheetId: newPartsSheet.properties.sheetId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    {
      repeatCell: {
        range: {
          sheetId: newPartsSheet.properties.sheetId,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: LSU_PURPLE,
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true
            },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    }
  );

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: PARTS_ORDERS_ID,
    requestBody: { requests: formatRequests }
  });

  console.log('Applied formatting to Parts Orders');
}

/**
 * Populate sample data
 */
async function populateSampleData() {
  console.log('\nPopulating sample data...');

  // Read CSV files
  const partsCSV = fs.readFileSync(path.join(__dirname, '..', 'data', 'parts.csv'), 'utf8');
  const studentsCSV = fs.readFileSync(path.join(__dirname, '..', 'data', 'students.csv'), 'utf8');

  // Parse CSV to array (simple parsing)
  const parseCSV = (csv) => {
    return csv.split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Simple CSV parser - handles quoted fields
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        fields.push(current.trim());
        return fields;
      });
  };

  const partsData = parseCSV(partsCSV);
  const studentsData = parseCSV(studentsCSV);

  // Remove header rows (already added)
  partsData.shift();
  studentsData.shift();

  // Add parts data
  if (partsData.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Parts!A2',
      valueInputOption: 'RAW',
      requestBody: { values: partsData }
    });
    console.log(`Added ${partsData.length} sample parts`);
  }

  // Add students data
  if (studentsData.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: PARTS_ORDERS_ID,
      range: 'Students!A2',
      valueInputOption: 'RAW',
      requestBody: { values: studentsData }
    });
    console.log(`Added ${studentsData.length} sample students`);
  }
}

/**
 * Main setup function
 */
async function main() {
  try {
    console.log('========================================');
    console.log('Denham Venom Parts System Setup');
    console.log('========================================');
    console.log('\nParts Directory ID:', PARTS_DIRECTORY_ID);
    console.log('Parts Orders ID:', PARTS_ORDERS_ID);

    await setupPartsDirectory();
    await setupPartsOrders();
    await populateSampleData();

    console.log('\n========================================');
    console.log('Setup Complete!');
    console.log('========================================');
    console.log('\nNext steps:');
    console.log('1. Update src/Code.js with the spreadsheet IDs');
    console.log('2. Run: npm run push');
    console.log('3. Deploy the web app');
    console.log('\nSpreadsheet URLs:');
    console.log(`Parts Directory: https://docs.google.com/spreadsheets/d/${PARTS_DIRECTORY_ID}`);
    console.log(`Parts Orders: https://docs.google.com/spreadsheets/d/${PARTS_ORDERS_ID}`);

  } catch (error) {
    console.error('\nError during setup:', error.message);
    if (error.errors) {
      console.error('Details:', error.errors);
    }
    process.exit(1);
  }
}

main();
