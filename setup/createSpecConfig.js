/**
 * Creates the Spec Config sheet in Parts Directory spreadsheet
 * This sheet defines which specification fields apply to each category/subcategory
 */

const { google } = require('googleapis');
const path = require('path');

// Spreadsheet ID for Parts Directory
const PARTS_DIRECTORY_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';

// Team branding colors
const TEAM_COLORS = {
  purple: '#461D7C',
  gold: '#FDD023'
};

// Spec configurations for all category/subcategory combinations
const SPEC_CONFIGS = [
  // Fasteners
  ['Fasteners', 'Screws', 'Type', 'Size', 'Length', 'Material', 'Y', 'Y', 'Y', 'N'],
  ['Fasteners', 'Nuts', 'Type', 'Size', '', 'Material', 'Y', 'Y', 'N', 'Y'],
  ['Fasteners', 'Washers', 'Type', 'Size', '', 'Material', 'Y', 'Y', 'N', 'N'],
  ['Fasteners', 'Rivets', 'Type', 'Size', 'Grip Range', 'Material', 'Y', 'Y', 'Y', 'N'],
  ['Fasteners', 'Adhesive', 'Type', 'Strength', '', '', 'Y', 'Y', 'N', 'N'],

  // Electronics and Sensors
  ['Electronics and Sensors', 'Motor Controllers', 'Type', 'Current', '', '', 'Y', 'Y', 'N', 'N'],
  ['Electronics and Sensors', 'Sensors', 'Type', 'Interface', '', '', 'Y', 'Y', 'N', 'N'],
  ['Electronics and Sensors', 'Power Distribution', 'Type', 'Channels', '', '', 'Y', 'Y', 'N', 'N'],

  // Raw Stock
  ['Raw Stock', 'Aluminum', 'Form', 'Dimensions', 'Thickness', 'Alloy', 'Y', 'Y', 'Y', 'Y'],
  ['Raw Stock', 'Polycarbonate', 'Form', 'Dimensions', 'Thickness', '', 'Y', 'Y', 'Y', 'N'],
  ['Raw Stock', 'Steel', 'Form', 'Dimensions', 'Thickness', 'Grade', 'Y', 'Y', 'Y', 'Y'],

  // Movement
  ['Movement', 'Motors', 'Type', 'Size', 'Free Speed', '', 'Y', 'Y', 'Y', 'N'],
  ['Movement', 'Bearings', 'Type', 'Bore', 'OD', '', 'Y', 'Y', 'Y', 'N'],
  ['Movement', 'Gearboxes', 'Type', 'Ratio', 'Stages', '', 'Y', 'Y', 'N', 'N'],
  ['Movement', 'Chain', 'Pitch', '', '', '', 'Y', 'N', 'N', 'N'],
  ['Movement', 'Sprockets', 'Pitch', 'Teeth', 'Bore', '', 'Y', 'Y', 'Y', 'N'],

  // Build Site Equipment
  ['Build Site Equipment', 'Power Tools', 'Type', 'Voltage', '', '', 'Y', 'Y', 'N', 'N'],
  ['Build Site Equipment', 'Cleaning', 'Type', 'Capacity', '', '', 'Y', 'Y', 'N', 'N'],
  ['Build Site Equipment', 'Lighting', 'Type', 'Lumens', '', '', 'Y', 'Y', 'N', 'N'],

  // Pneumatics
  ['Pneumatics', 'Cylinders', 'Type', 'Bore', 'Stroke', '', 'Y', 'Y', 'Y', 'N'],
  ['Pneumatics', 'Valves', 'Type', 'Ports', 'Voltage', '', 'Y', 'Y', 'Y', 'N'],
  ['Pneumatics', 'Regulators', 'Type', 'Max PSI', '', '', 'Y', 'Y', 'N', 'N'],
  ['Pneumatics', 'Tubing', 'Material', 'OD', '', '', 'Y', 'Y', 'N', 'N'],

  // Business, Outreach, Media
  ['Business, Outreach, Media', 'Apparel', 'Type', 'Size', 'Color', '', 'Y', 'Y', 'Y', 'N'],
  ['Business, Outreach, Media', 'Display', 'Type', 'Dimensions', '', '', 'Y', 'Y', 'N', 'N'],
  ['Business, Outreach, Media', 'Marketing', 'Type', 'Dimensions', '', '', 'Y', 'Y', 'N', 'N'],

  // Machining Tools
  ['Machining Tools', 'Cutting Tools', 'Type', 'Size', 'Flutes', 'Material', 'Y', 'Y', 'N', 'Y'],
  ['Machining Tools', 'Threading Tools', 'Type', 'Size', '', '', 'Y', 'Y', 'N', 'N'],
  ['Machining Tools', 'Measuring Tools', 'Type', 'Range', 'Resolution', '', 'Y', 'Y', 'Y', 'N'],

  // Safety Equipment
  ['Safety Equipment', 'Eye Protection', 'Type', 'Standard', '', '', 'Y', 'Y', 'N', 'N'],
  ['Safety Equipment', 'Hand Protection', 'Type', 'Size', 'Rating', '', 'Y', 'Y', 'Y', 'N'],
  ['Safety Equipment', 'Medical', 'Type', 'Capacity', '', '', 'Y', 'Y', 'N', 'N'],

  // Wiring, Cables, Connectors
  ['Wiring, Cables, Connectors', 'Wires', 'Type', 'Gauge', 'Length', 'Color', 'Y', 'Y', 'Y', 'Y'],
  ['Wiring, Cables, Connectors', 'Cables', 'Type', 'Length', '', '', 'Y', 'Y', 'N', 'N'],
  ['Wiring, Cables, Connectors', 'Connectors', 'Type', 'Pins/Rating', '', '', 'Y', 'Y', 'N', 'N']
];

async function createSpecConfigSheet() {
  try {
    console.log('Loading Google Sheets API credentials...');

    // Load credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '..', 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log('Creating Spec Config sheet...');

    // Create the new sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: PARTS_DIRECTORY_ID,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Spec Config',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10,
                  frozenRowCount: 1
                }
              }
            }
          }
        ]
      }
    });

    console.log('Spec Config sheet created successfully');

    // Prepare header row
    const headers = [
      'Category',
      'Subcategory',
      'Spec1_Label',
      'Spec2_Label',
      'Spec3_Label',
      'Spec4_Label',
      'Spec1_Required',
      'Spec2_Required',
      'Spec3_Required',
      'Spec4_Required'
    ];

    // Combine headers and data
    const values = [headers, ...SPEC_CONFIGS];

    console.log('Writing spec configuration data...');

    // Write all data to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Spec Config!A1',
      valueInputOption: 'RAW',
      resource: {
        values: values
      }
    });

    console.log(`Added ${SPEC_CONFIGS.length} spec configurations`);

    // Format the header row
    console.log('Formatting header row...');

    // Get the sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: PARTS_DIRECTORY_ID
    });

    const specConfigSheet = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title === 'Spec Config'
    );

    if (!specConfigSheet) {
      throw new Error('Could not find Spec Config sheet after creation');
    }

    const sheetId = specConfigSheet.properties.sheetId;

    // Apply formatting
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: PARTS_DIRECTORY_ID,
      resource: {
        requests: [
          // Format header row
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 10
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 70 / 255,
                    green: 29 / 255,
                    blue: 124 / 255
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1
                    },
                    fontSize: 10,
                    bold: true
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          },
          // Auto-resize all columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 10
              }
            }
          }
        ]
      }
    });

    console.log('Formatting applied successfully');
    console.log('');
    console.log('SUCCESS: Spec Config sheet created with all configurations');
    console.log(`Total configurations: ${SPEC_CONFIGS.length}`);

  } catch (error) {
    console.error('ERROR creating Spec Config sheet:', error.message);
    if (error.message.includes('already exists')) {
      console.error('The Spec Config sheet already exists. Delete it manually and try again.');
    }
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createSpecConfigSheet()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createSpecConfigSheet };
