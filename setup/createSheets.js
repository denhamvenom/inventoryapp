/**
 * Google Sheets Setup Script for Denham Venom Parts System
 * Creates and configures the Parts Directory and Parts Orders spreadsheets
 * 
 * Usage: node setup/createSheets.js
 * 
 * Prerequisites:
 * - Google Cloud Project with Sheets API enabled
 * - credentials.json file in project root
 * - Run npm install first to install dependencies
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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
 * Create a new Google Spreadsheet with specified title
 * @param {string} title - The title of the spreadsheet
 * @returns {Promise<string>} The spreadsheet ID
 */
async function createSpreadsheet(title) {
  try {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title
        }
      }
    });
    console.log(`Created spreadsheet: ${title}`);
    console.log(`Spreadsheet ID: ${response.data.spreadsheetId}`);
    return response.data.spreadsheetId;
  } catch (error) {
    console.error(`Error creating spreadsheet ${title}:`, error.message);
    throw error;
  }
}

/**
 * Format header row with styling
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} sheetId - The sheet ID
 * @param {number} numColumns - Number of columns in header
 */
async function formatHeaderRow(spreadsheetId, sheetId, numColumns) {
  const requests = [
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: numColumns
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.275,
              green: 0.114,
              blue: 0.486
            },
            textFormat: {
              foregroundColor: {
                red: 1,
                green: 1,
                blue: 1
              },
              fontSize: 11,
              bold: true
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId: sheetId,
          gridProperties: {
            frozenRowCount: 1
          }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: { requests }
  });
}

/**
 * Set column widths for a sheet
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} sheetId - The sheet ID
 * @param {Object} columnWidths - Map of column names to widths
 * @param {Array} headers - Array of header names
 */
async function setColumnWidths(spreadsheetId, sheetId, columnWidths, headers) {
  if (!columnWidths) return;

  const requests = headers.map((header, index) => {
    const width = columnWidths[header] || 120;
    return {
      updateDimensionProperties: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: index,
          endIndex: index + 1
        },
        properties: {
          pixelSize: width
        },
        fields: 'pixelSize'
      }
    };
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: { requests }
  });
}

/**
 * Add data validation to columns
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} sheetId - The sheet ID
 * @param {Object} validation - Validation rules
 * @param {Array} headers - Array of header names
 */
async function addDataValidation(spreadsheetId, sheetId, validation, headers) {
  if (!validation) return;

  const requests = [];

  for (const [columnName, values] of Object.entries(validation)) {
    const columnIndex = headers.indexOf(columnName);
    if (columnIndex === -1) continue;

    const validationRule = {
      setDataValidation: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1,
          startColumnIndex: columnIndex,
          endColumnIndex: columnIndex + 1
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: Array.isArray(values) 
              ? values.map(v => ({ userEnteredValue: v }))
              : [{ userEnteredValue: values }]
          },
          showCustomUi: true,
          strict: true
        }
      }
    };

    requests.push(validationRule);
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: { requests }
    });
  }
}

/**
 * Add conditional formatting to a sheet
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {number} sheetId - The sheet ID
 * @param {Object} formatting - Conditional formatting rules
 * @param {Array} headers - Array of header names
 */
async function addConditionalFormatting(spreadsheetId, sheetId, formatting, headers) {
  if (!formatting) return;

  const requests = [];

  for (const [columnName, rules] of Object.entries(formatting)) {
    const columnIndex = headers.indexOf(columnName);
    if (columnIndex === -1) continue;

    for (const [value, format] of Object.entries(rules)) {
      const bgColor = format.backgroundColor || '#ffffff';
      const rgb = hexToRgb(bgColor);

      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId: sheetId,
              startRowIndex: 1,
              startColumnIndex: columnIndex,
              endColumnIndex: columnIndex + 1
            }],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ',
                values: [{ userEnteredValue: value }]
              },
              format: {
                backgroundColor: {
                  red: rgb.r / 255,
                  green: rgb.g / 255,
                  blue: rgb.b / 255
                }
              }
            }
          },
          index: 0
        }
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: { requests }
    });
  }
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color code
 * @returns {Object} RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Create and configure a sheet within a spreadsheet
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {Object} sheetConfig - Sheet configuration object
 * @param {boolean} isFirstSheet - Whether this is the first sheet (rename Sheet1)
 */
async function createSheet(spreadsheetId, sheetConfig, isFirstSheet = false) {
  let sheetId;

  if (isFirstSheet) {
    // Rename the default Sheet1
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    sheetId = spreadsheet.data.sheets[0].properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              title: sheetConfig.name
            },
            fields: 'title'
          }
        }]
      }
    });
  } else {
    // Add a new sheet
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: sheetConfig.name
            }
          }
        }]
      }
    });
    sheetId = response.data.replies[0].addSheet.properties.sheetId;
  }

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: `${sheetConfig.name}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [sheetConfig.headers]
    }
  });

  // Format header row
  await formatHeaderRow(spreadsheetId, sheetId, sheetConfig.headers.length);

  // Set column widths
  if (sheetConfig.columnWidths) {
    await setColumnWidths(spreadsheetId, sheetId, sheetConfig.columnWidths, sheetConfig.headers);
  }

  // Add data validation
  if (sheetConfig.validation) {
    await addDataValidation(spreadsheetId, sheetId, sheetConfig.validation, sheetConfig.headers);
  }

  // Add conditional formatting
  if (sheetConfig.conditionalFormatting) {
    await addConditionalFormatting(spreadsheetId, sheetId, sheetConfig.conditionalFormatting, sheetConfig.headers);
  }

  console.log(`  - Created sheet: ${sheetConfig.name}`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('========================================');
  console.log('Denham Venom Parts System Setup');
  console.log('========================================\n');

  try {
    const spreadsheetIds = {};

    // Create Parts Directory spreadsheet
    console.log('Creating Parts Directory spreadsheet...');
    const partsDirectoryId = await createSpreadsheet(
      config.spreadsheets.partsDirectory.name
    );
    spreadsheetIds.partsDirectory = partsDirectoryId;

    // Create sheets in Parts Directory
    for (let i = 0; i < config.spreadsheets.partsDirectory.sheets.length; i++) {
      const sheetConfig = config.spreadsheets.partsDirectory.sheets[i];
      await createSheet(partsDirectoryId, sheetConfig, i === 0);
    }

    console.log();

    // Create Parts Orders spreadsheet
    console.log('Creating Parts Orders spreadsheet...');
    const partsOrdersId = await createSpreadsheet(
      config.spreadsheets.partsOrders.name
    );
    spreadsheetIds.partsOrders = partsOrdersId;

    // Create sheets in Parts Orders
    for (let i = 0; i < config.spreadsheets.partsOrders.sheets.length; i++) {
      const sheetConfig = config.spreadsheets.partsOrders.sheets[i];
      await createSheet(partsOrdersId, sheetConfig, i === 0);
    }

    console.log();
    console.log('========================================');
    console.log('Setup Complete!');
    console.log('========================================\n');
    console.log('Spreadsheet IDs:');
    console.log(`Parts Directory: ${spreadsheetIds.partsDirectory}`);
    console.log(`Parts Orders: ${spreadsheetIds.partsOrders}\n`);
    console.log('IMPORTANT: Copy these IDs to your .env file:');
    console.log(`PARTS_DIRECTORY_ID=${spreadsheetIds.partsDirectory}`);
    console.log(`PARTS_ORDERS_ID=${spreadsheetIds.partsOrders}\n`);
    console.log('Next steps:');
    console.log('1. Add the spreadsheet IDs to your .env file');
    console.log('2. Run "npm run init-data" to populate sample data');
    console.log('3. Run "clasp push" to deploy the Apps Script code');
    console.log('4. Run "clasp deploy" to create a web app deployment\n');

    // Save spreadsheet IDs to a file for use by populateData.js
    const idsPath = path.join(__dirname, 'spreadsheet-ids.json');
    fs.writeFileSync(idsPath, JSON.stringify(spreadsheetIds, null, 2));
    console.log(`Spreadsheet IDs saved to: ${idsPath}\n`);

  } catch (error) {
    console.error('Error during setup:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
