/**
 * Denham Venom Parts Management System
 * Team 8044 - Main Server-Side Code (COMPLETE MERGED VERSION)
 *
 * This Google Apps Script handles all server-side operations for the parts
 * management system including inventory queries, order processing, and part additions.
 *
 * UPDATED TO SUPPORT:
 * - 3-level hierarchy: Category → Subcategory → Type
 * - 5 specification fields (Spec 1-5)
 * - New 20-column Parts sheet structure
 * - New 9-column Spec Config structure
 */

// Configuration - Update these with your actual spreadsheet IDs
const CONFIG = {
  PARTS_DIRECTORY_ID: '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo',
  PARTS_ORDERS_ID: '1f-4T0wMjLQKnA-dbFMgUDRKnSuwi0kjdSl91MuRHpeQ',
  PARTS_SHEET_NAME: 'Parts',
  ORDERS_SHEET_NAME: 'Orders',
  STUDENTS_SHEET_NAME: 'Students',
  SPEC_CONFIG_SHEET_NAME: 'Spec Config',
  ADD_PART_PASSWORD: 'venom8044',
  MONDAY_ADMIN_PASSWORD: 'eiland8044!'
};

/**
 * Verifies Monday.com admin password
 * @param {string} password - Password to verify
 * @returns {boolean} True if password is correct
 */
function verifyMondayAdminPassword(password) {
  return password === CONFIG.MONDAY_ADMIN_PASSWORD;
}

/**
 * Serves the web application
 * @param {Object} e - Event object containing request parameters
 * @returns {HtmlOutput} The HTML page to display
 */
function doGet(e) {
  try {
    const template = HtmlService.createTemplateFromFile('WebApp');
    return template.evaluate()
      .setTitle('Denham Venom Parts System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return HtmlService.createHtmlOutput('<h1>Error loading application</h1><p>' + error.toString() + '</p>');
  }
}

/**
 * Gets all unique categories from the parts directory
 * Reads from the Categories sheet to include all valid categories,
 * not just those with existing parts
 * @returns {Array<string>} Sorted array of category names
 */
function getCategories() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName('Categories');

    if (!sheet) {
      Logger.log('Available sheets: ' + ss.getSheets().map(s => s.getName()).join(', '));
      throw new Error('Categories sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    Logger.log('Categories sheet data length: ' + data.length + ' rows');

    if (data.length < 2) {
      Logger.log('No data in Categories sheet');
      return []; // No category data
    }

    const headers = data[0];
    Logger.log('Categories sheet headers: ' + JSON.stringify(headers));
    Logger.log('Header[0] is: "' + headers[0] + '"');
    Logger.log('Total header columns: ' + headers.length);
    Logger.log('Total data rows: ' + data.length);
    let categoryNameCol = headers.indexOf('Category Name');

    // Try alternate header name if not found
    if (categoryNameCol === -1) {
      categoryNameCol = headers.indexOf('Category');
    }

    if (categoryNameCol === -1) {
      Logger.log('Category Name or Category column not found. Checking all headers:');
      for (let j = 0; j < headers.length; j++) {
        Logger.log('Column ' + j + ': "' + headers[j] + '"');
      }
      throw new Error('Category Name column not found in Categories sheet. Available columns: ' + headers.join(', '));
    }

    const categories = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][categoryNameCol]) {
        const categoryName = data[i][categoryNameCol].toString().trim();
        if (categoryName) {
          categories.push(categoryName);
        }
      }
    }

    Logger.log('Retrieved ' + categories.length + ' categories from Categories sheet');
    Logger.log('Data rows processed: ' + (data.length - 1) + ', Category Name column index: ' + categoryNameCol);
    Logger.log('All categories retrieved: ' + JSON.stringify(categories.sort()));
    return categories.sort();
  } catch (error) {
    Logger.log('Error in getCategories: ' + error.toString());
    throw new Error('Failed to retrieve categories: ' + error.message);
  }
}

/**
 * Gets unique subcategories for a given category
 * @param {string} category - The category to filter by
 * @returns {Array<string>} Sorted array of subcategory names
 */
function getSubcategories(category) {
  try {
    if (!category) {
      return [];
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const categoryCol = headers.indexOf('Category');
    const subcategoryCol = headers.indexOf('Subcategory');

    if (categoryCol === -1 || subcategoryCol === -1) {
      throw new Error('Required columns not found');
    }

    const subcategories = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][categoryCol] &&
          data[i][categoryCol].toString().trim() === category &&
          data[i][subcategoryCol]) {
        subcategories.add(data[i][subcategoryCol].toString().trim());
      }
    }

    return Array.from(subcategories).sort();
  } catch (error) {
    Logger.log('Error in getSubcategories: ' + error.toString());
    throw new Error('Failed to retrieve subcategories: ' + error.message);
  }
}

/**
 * Gets unique types for a given category and subcategory (NEW FUNCTION)
 * @param {string} category - The category to filter by
 * @param {string} subcategory - The subcategory to filter by
 * @returns {Array<string>} Sorted array of type names
 */
function getTypes(category, subcategory) {
  try {
    if (!category || !subcategory) {
      return [];
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const categoryCol = headers.indexOf('Category');
    const subcategoryCol = headers.indexOf('Subcategory');
    const typeCol = headers.indexOf('Type');

    if (categoryCol === -1 || subcategoryCol === -1 || typeCol === -1) {
      throw new Error('Required columns not found');
    }

    const types = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][categoryCol] &&
          data[i][categoryCol].toString().trim() === category &&
          data[i][subcategoryCol] &&
          data[i][subcategoryCol].toString().trim() === subcategory &&
          data[i][typeCol]) {
        types.add(data[i][typeCol].toString().trim());
      }
    }

    return Array.from(types).sort();
  } catch (error) {
    Logger.log('Error in getTypes: ' + error.toString());
    throw new Error('Failed to retrieve types: ' + error.message);
  }
}

/**
 * Gets parts based on category, subcategory, type, and optional spec filters (UPDATED)
 * @param {Object} filters - Object containing filter criteria
 * @param {string} filters.category - The category to filter by
 * @param {string} filters.subcategory - The subcategory to filter by
 * @param {string} filters.type - The type to filter by (NEW)
 * @param {string} filters.spec1 - Optional spec1 filter value
 * @param {string} filters.spec2 - Optional spec2 filter value
 * @param {string} filters.spec3 - Optional spec3 filter value
 * @param {string} filters.spec4 - Optional spec4 filter value
 * @param {string} filters.spec5 - Optional spec5 filter value (NEW)
 * @returns {Array<Object>} Array of matching parts with their details
 */
function getPartsByFilters(filters) {
  try {
    if (!filters || !filters.category || !filters.subcategory) {
      return [];
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices for 20-column structure
    const colIndices = {
      partID: headers.indexOf('Part ID'),
      partName: headers.indexOf('Part Name'),
      category: headers.indexOf('Category'),
      subcategory: headers.indexOf('Subcategory'),
      type: headers.indexOf('Type'),  // NEW
      productCode: headers.indexOf('Product Code'),
      spec1: headers.indexOf('Spec 1'),
      spec2: headers.indexOf('Spec 2'),
      spec3: headers.indexOf('Spec 3'),
      spec4: headers.indexOf('Spec 4'),
      spec5: headers.indexOf('Spec 5'),  // NEW
      quantityPer: headers.indexOf('Quantity Per'),
      cost: headers.indexOf('Cost'),
      supplier: headers.indexOf('Supplier'),
      orderLink: headers.indexOf('Order Link'),
      location: headers.indexOf('Location/Bin'),
      inventory: headers.indexOf('Inventory'),
      seasons: headers.indexOf('Seasons')
    };

    // Validate required columns exist
    for (const [key, index] of Object.entries(colIndices)) {
      if (index === -1) {
        Logger.log('Warning: Column not found: ' + key);
      }
    }

    const parts = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Match category, subcategory, and type
      const matchesCategory = row[colIndices.category] &&
                             row[colIndices.category].toString().trim() === filters.category;
      const matchesSubcategory = row[colIndices.subcategory] &&
                                 row[colIndices.subcategory].toString().trim() === filters.subcategory;

      // Type filtering (optional - if not provided, matches all)
      let matchesType = true;
      if (filters.type && filters.type.trim()) {
        matchesType = row[colIndices.type] &&
                     row[colIndices.type].toString().trim() === filters.type;
      }

      // Match individual spec filters if provided (empty string means "All")
      let matchesSpec1 = true;
      if (filters.spec1 && filters.spec1.trim()) {
        const rowSpec1 = row[colIndices.spec1] ? row[colIndices.spec1].toString().trim() : '';
        matchesSpec1 = rowSpec1 === filters.spec1;
      }

      let matchesSpec2 = true;
      if (filters.spec2 && filters.spec2.trim()) {
        const rowSpec2 = row[colIndices.spec2] ? row[colIndices.spec2].toString().trim() : '';
        matchesSpec2 = rowSpec2 === filters.spec2;
      }

      let matchesSpec3 = true;
      if (filters.spec3 && filters.spec3.trim()) {
        const rowSpec3 = row[colIndices.spec3] ? row[colIndices.spec3].toString().trim() : '';
        matchesSpec3 = rowSpec3 === filters.spec3;
      }

      let matchesSpec4 = true;
      if (filters.spec4 && filters.spec4.trim()) {
        const rowSpec4 = row[colIndices.spec4] ? row[colIndices.spec4].toString().trim() : '';
        matchesSpec4 = rowSpec4 === filters.spec4;
      }

      // NEW: Spec 5 filtering
      let matchesSpec5 = true;
      if (filters.spec5 && filters.spec5.trim()) {
        const rowSpec5 = row[colIndices.spec5] ? row[colIndices.spec5].toString().trim() : '';
        matchesSpec5 = rowSpec5 === filters.spec5;
      }

      if (matchesCategory && matchesSubcategory && matchesType &&
          matchesSpec1 && matchesSpec2 && matchesSpec3 && matchesSpec4 && matchesSpec5) {
        parts.push({
          partID: row[colIndices.partID] || '',
          partName: row[colIndices.partName] || '',
          category: row[colIndices.category] || '',
          subcategory: row[colIndices.subcategory] || '',
          type: row[colIndices.type] || '',  // NEW
          productCode: row[colIndices.productCode] || '',
          spec1: row[colIndices.spec1] || '',
          spec2: row[colIndices.spec2] || '',
          spec3: row[colIndices.spec3] || '',
          spec4: row[colIndices.spec4] || '',
          spec5: row[colIndices.spec5] || '',  // NEW
          quantityPer: row[colIndices.quantityPer] || '',
          unitCost: parseFloat(row[colIndices.cost]) || 0,
          supplier: row[colIndices.supplier] || '',
          orderLink: row[colIndices.orderLink] || '',
          location: row[colIndices.location] || '',
          inventory: row[colIndices.inventory] || 'No',
          seasons: row[colIndices.seasons] || ''
        });
      }
    }

    return parts.sort((a, b) => a.partName.localeCompare(b.partName));
  } catch (error) {
    Logger.log('Error in getPartsByFilters: ' + error.toString());
    throw new Error('Failed to retrieve parts: ' + error.message);
  }
}

/**
 * Gets parts by product code (case-insensitive exact match) (UPDATED)
 * @param {string} productCode - The product code to search for
 * @returns {Array<Object>} Array of matching parts
 */
function getPartsByProductCode(productCode) {
  try {
    if (!productCode) return [];

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices (same as getPartsByFilters)
    const colIndices = {
      partID: headers.indexOf('Part ID'),
      partName: headers.indexOf('Part Name'),
      category: headers.indexOf('Category'),
      subcategory: headers.indexOf('Subcategory'),
      type: headers.indexOf('Type'),  // NEW
      productCode: headers.indexOf('Product Code'),
      spec1: headers.indexOf('Spec 1'),
      spec2: headers.indexOf('Spec 2'),
      spec3: headers.indexOf('Spec 3'),
      spec4: headers.indexOf('Spec 4'),
      spec5: headers.indexOf('Spec 5'),  // NEW
      quantityPer: headers.indexOf('Quantity Per'),
      cost: headers.indexOf('Cost'),
      supplier: headers.indexOf('Supplier'),
      orderLink: headers.indexOf('Order Link'),
      location: headers.indexOf('Location/Bin'),
      inventory: headers.indexOf('Inventory'),
      seasons: headers.indexOf('Seasons')
    };

    const parts = [];
    const searchCode = productCode.toLowerCase().trim();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowProductCode = row[colIndices.productCode] ? row[colIndices.productCode].toString().trim().toLowerCase() : '';

      if (rowProductCode === searchCode) {
        parts.push({
          partID: row[colIndices.partID] || '',
          partName: row[colIndices.partName] || '',
          category: row[colIndices.category] || '',
          subcategory: row[colIndices.subcategory] || '',
          type: row[colIndices.type] || '',  // NEW
          productCode: row[colIndices.productCode] || '',
          spec1: row[colIndices.spec1] || '',
          spec2: row[colIndices.spec2] || '',
          spec3: row[colIndices.spec3] || '',
          spec4: row[colIndices.spec4] || '',
          spec5: row[colIndices.spec5] || '',  // NEW
          quantityPer: row[colIndices.quantityPer] || '',
          unitCost: parseFloat(row[colIndices.cost]) || 0,
          supplier: row[colIndices.supplier] || '',
          orderLink: row[colIndices.orderLink] || '',
          location: row[colIndices.location] || '',
          inventory: row[colIndices.inventory] || 'No',
          seasons: row[colIndices.seasons] || ''
        });
      }
    }

    return parts.sort((a, b) => a.partName.localeCompare(b.partName));
  } catch (error) {
    Logger.log('Error in getPartsByProductCode: ' + error.toString());
    throw new Error('Failed to search by product code: ' + error.message);
  }
}

/**
 * Searches parts by text across multiple fields
 * @param {string} searchText - Text to search for (case-insensitive)
 * @param {Array<string>} searchFields - Fields to search: ['name', 'id', 'code', 'specs']
 * @returns {Array<Object>} Array of matching parts
 */
function searchPartsByText(searchText, searchFields) {
  try {
    if (!searchText || !searchFields || searchFields.length === 0) {
      return [];
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices
    const colIndices = {
      partID: headers.indexOf('Part ID'),
      partName: headers.indexOf('Part Name'),
      category: headers.indexOf('Category'),
      subcategory: headers.indexOf('Subcategory'),
      type: headers.indexOf('Type'),
      productCode: headers.indexOf('Product Code'),
      spec1: headers.indexOf('Spec 1'),
      spec2: headers.indexOf('Spec 2'),
      spec3: headers.indexOf('Spec 3'),
      spec4: headers.indexOf('Spec 4'),
      spec5: headers.indexOf('Spec 5'),
      quantityPer: headers.indexOf('Quantity Per'),
      cost: headers.indexOf('Cost'),
      supplier: headers.indexOf('Supplier'),
      orderLink: headers.indexOf('Order Link'),
      location: headers.indexOf('Location/Bin'),
      inventory: headers.indexOf('Inventory'),
      seasons: headers.indexOf('Seasons')
    };

    const parts = [];
    const searchLower = searchText.toLowerCase().trim();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      let matches = false;

      // Check each requested search field
      for (const field of searchFields) {
        if (field === 'name' && colIndices.partName !== -1) {
          const partName = row[colIndices.partName] ? row[colIndices.partName].toString().toLowerCase() : '';
          if (partName.includes(searchLower)) {
            matches = true;
            break;
          }
        }

        if (field === 'id' && colIndices.partID !== -1) {
          const partID = row[colIndices.partID] ? row[colIndices.partID].toString().toLowerCase() : '';
          if (partID.includes(searchLower)) {
            matches = true;
            break;
          }
        }

        if (field === 'code' && colIndices.productCode !== -1) {
          const productCode = row[colIndices.productCode] ? row[colIndices.productCode].toString().toLowerCase() : '';
          if (productCode.includes(searchLower)) {
            matches = true;
            break;
          }
        }

        if (field === 'specs') {
          // Search across all 5 spec fields
          const spec1 = row[colIndices.spec1] ? row[colIndices.spec1].toString().toLowerCase() : '';
          const spec2 = row[colIndices.spec2] ? row[colIndices.spec2].toString().toLowerCase() : '';
          const spec3 = row[colIndices.spec3] ? row[colIndices.spec3].toString().toLowerCase() : '';
          const spec4 = row[colIndices.spec4] ? row[colIndices.spec4].toString().toLowerCase() : '';
          const spec5 = row[colIndices.spec5] ? row[colIndices.spec5].toString().toLowerCase() : '';

          if (spec1.includes(searchLower) || spec2.includes(searchLower) ||
              spec3.includes(searchLower) || spec4.includes(searchLower) ||
              spec5.includes(searchLower)) {
            matches = true;
            break;
          }
        }
      }

      if (matches) {
        parts.push({
          partID: row[colIndices.partID] || '',
          partName: row[colIndices.partName] || '',
          category: row[colIndices.category] || '',
          subcategory: row[colIndices.subcategory] || '',
          type: row[colIndices.type] || '',
          productCode: row[colIndices.productCode] || '',
          spec1: row[colIndices.spec1] || '',
          spec2: row[colIndices.spec2] || '',
          spec3: row[colIndices.spec3] || '',
          spec4: row[colIndices.spec4] || '',
          spec5: row[colIndices.spec5] || '',
          quantityPer: row[colIndices.quantityPer] || '',
          unitCost: parseFloat(row[colIndices.cost]) || 0,
          supplier: row[colIndices.supplier] || '',
          orderLink: row[colIndices.orderLink] || '',
          location: row[colIndices.location] || '',
          inventory: row[colIndices.inventory] || 'No',
          seasons: row[colIndices.seasons] || ''
        });
      }
    }

    return parts.sort((a, b) => a.partName.localeCompare(b.partName));
  } catch (error) {
    Logger.log('Error in searchPartsByText: ' + error.toString());
    throw new Error('Failed to search parts: ' + error.message);
  }
}

/**
 * Gets all parts marked as Inventory (common stock)
 * @returns {Array<Object>} Array of inventory parts
 */
function getInventoryParts() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices
    const colIndices = {
      partID: headers.indexOf('Part ID'),
      partName: headers.indexOf('Part Name'),
      category: headers.indexOf('Category'),
      subcategory: headers.indexOf('Subcategory'),
      type: headers.indexOf('Type'),
      productCode: headers.indexOf('Product Code'),
      spec1: headers.indexOf('Spec 1'),
      spec2: headers.indexOf('Spec 2'),
      spec3: headers.indexOf('Spec 3'),
      spec4: headers.indexOf('Spec 4'),
      spec5: headers.indexOf('Spec 5'),
      quantityPer: headers.indexOf('Quantity Per'),
      cost: headers.indexOf('Cost'),
      supplier: headers.indexOf('Supplier'),
      orderLink: headers.indexOf('Order Link'),
      location: headers.indexOf('Location/Bin'),
      inventory: headers.indexOf('Inventory'),
      seasons: headers.indexOf('Seasons')
    };

    if (colIndices.inventory === -1) {
      throw new Error('Inventory column not found');
    }

    const parts = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const inventoryValue = row[colIndices.inventory] ? row[colIndices.inventory].toString().trim() : '';

      if (inventoryValue === 'Yes') {
        parts.push({
          partID: row[colIndices.partID] || '',
          partName: row[colIndices.partName] || '',
          category: row[colIndices.category] || '',
          subcategory: row[colIndices.subcategory] || '',
          type: row[colIndices.type] || '',
          productCode: row[colIndices.productCode] || '',
          spec1: row[colIndices.spec1] || '',
          spec2: row[colIndices.spec2] || '',
          spec3: row[colIndices.spec3] || '',
          spec4: row[colIndices.spec4] || '',
          spec5: row[colIndices.spec5] || '',
          quantityPer: row[colIndices.quantityPer] || '',
          unitCost: parseFloat(row[colIndices.cost]) || 0,
          supplier: row[colIndices.supplier] || '',
          orderLink: row[colIndices.orderLink] || '',
          location: row[colIndices.location] || '',
          inventory: row[colIndices.inventory] || 'No',
          seasons: row[colIndices.seasons] || ''
        });
      }
    }

    return parts.sort((a, b) => a.partName.localeCompare(b.partName));
  } catch (error) {
    Logger.log('Error in getInventoryParts: ' + error.toString());
    throw new Error('Failed to retrieve inventory parts: ' + error.message);
  }
}

/**
 * Gets all parts tagged for a specific season
 * @param {string} season - Season to filter (e.g., "2024-2025")
 * @returns {Array<Object>} Array of season parts
 */
function getSeasonParts(season) {
  try {
    if (!season) {
      return [];
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices
    const colIndices = {
      partID: headers.indexOf('Part ID'),
      partName: headers.indexOf('Part Name'),
      category: headers.indexOf('Category'),
      subcategory: headers.indexOf('Subcategory'),
      type: headers.indexOf('Type'),
      productCode: headers.indexOf('Product Code'),
      spec1: headers.indexOf('Spec 1'),
      spec2: headers.indexOf('Spec 2'),
      spec3: headers.indexOf('Spec 3'),
      spec4: headers.indexOf('Spec 4'),
      spec5: headers.indexOf('Spec 5'),
      quantityPer: headers.indexOf('Quantity Per'),
      cost: headers.indexOf('Cost'),
      supplier: headers.indexOf('Supplier'),
      orderLink: headers.indexOf('Order Link'),
      location: headers.indexOf('Location/Bin'),
      inventory: headers.indexOf('Inventory'),
      seasons: headers.indexOf('Seasons')
    };

    if (colIndices.seasons === -1) {
      throw new Error('Seasons column not found');
    }

    const parts = [];
    const searchSeason = season.trim();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const seasonsValue = row[colIndices.seasons] ? row[colIndices.seasons].toString() : '';

      // Handle comma-separated values
      if (seasonsValue) {
        const seasonsList = seasonsValue.split(',').map(s => s.trim());
        if (seasonsList.includes(searchSeason)) {
          parts.push({
            partID: row[colIndices.partID] || '',
            partName: row[colIndices.partName] || '',
            category: row[colIndices.category] || '',
            subcategory: row[colIndices.subcategory] || '',
            type: row[colIndices.type] || '',
            productCode: row[colIndices.productCode] || '',
            spec1: row[colIndices.spec1] || '',
            spec2: row[colIndices.spec2] || '',
            spec3: row[colIndices.spec3] || '',
            spec4: row[colIndices.spec4] || '',
            spec5: row[colIndices.spec5] || '',
            quantityPer: row[colIndices.quantityPer] || '',
            unitCost: parseFloat(row[colIndices.cost]) || 0,
            supplier: row[colIndices.supplier] || '',
            orderLink: row[colIndices.orderLink] || '',
            location: row[colIndices.location] || '',
            inventory: row[colIndices.inventory] || 'No',
            seasons: row[colIndices.seasons] || ''
          });
        }
      }
    }

    return parts.sort((a, b) => a.partName.localeCompare(b.partName));
  } catch (error) {
    Logger.log('Error in getSeasonParts: ' + error.toString());
    throw new Error('Failed to retrieve season parts: ' + error.message);
  }
}

/**
 * Gets list of all seasons from Seasons sheet
 * @returns {Array<string>} Array of season names, sorted
 */
function getSeasonsList() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName('Seasons');

    if (!sheet) {
      Logger.log('Seasons sheet not found');
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const seasons = [];

    // Skip header row (index 0), read column A
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() !== '') {
        seasons.push(data[i][0].toString().trim());
      }
    }

    return seasons.sort();
  } catch (error) {
    Logger.log('Error in getSeasonsList: ' + error.toString());
    return [];
  }
}

/**
 * Updates inventory flag for a part
 * @param {string} partID - Part ID to update
 * @param {boolean} isInventory - True to add to inventory, false to remove
 * @returns {Object} Result with success flag and message
 */
function updatePartInventory(partID, isInventory) {
  try {
    if (!partID) {
      return {
        success: false,
        message: 'Part ID is required'
      };
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const partIDCol = headers.indexOf('Part ID');
    const inventoryCol = headers.indexOf('Inventory');

    if (partIDCol === -1 || inventoryCol === -1) {
      throw new Error('Required columns not found');
    }

    // Find the part
    for (let i = 1; i < data.length; i++) {
      const rowPartID = data[i][partIDCol] ? data[i][partIDCol].toString().trim() : '';
      if (rowPartID === partID.trim()) {
        // Update inventory value
        const newValue = isInventory ? 'Yes' : 'No';
        sheet.getRange(i + 1, inventoryCol + 1).setValue(newValue);

        // Clear cache
        const cache = CacheService.getScriptCache();
        cache.removeAll(['specConfig_', 'specValues_']);

        return {
          success: true,
          message: 'Inventory status updated successfully'
        };
      }
    }

    return {
      success: false,
      message: 'Part ID not found: ' + partID
    };
  } catch (error) {
    Logger.log('Error in updatePartInventory: ' + error.toString());
    return {
      success: false,
      message: 'Failed to update inventory: ' + error.message
    };
  }
}

/**
 * Adds or removes a season from a part's season list
 * @param {string} partID - Part ID to update
 * @param {string} action - "add" or "remove"
 * @param {string} season - Season to add/remove
 * @returns {Object} Result with success flag, message, and updated seasons string
 */
function updatePartSeasons(partID, action, season) {
  try {
    if (!partID || !action || !season) {
      return {
        success: false,
        message: 'Part ID, action, and season are required'
      };
    }

    if (action !== 'add' && action !== 'remove') {
      return {
        success: false,
        message: 'Action must be "add" or "remove"'
      };
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const partIDCol = headers.indexOf('Part ID');
    const seasonsCol = headers.indexOf('Seasons');

    if (partIDCol === -1 || seasonsCol === -1) {
      throw new Error('Required columns not found');
    }

    // Find the part
    for (let i = 1; i < data.length; i++) {
      const rowPartID = data[i][partIDCol] ? data[i][partIDCol].toString().trim() : '';
      if (rowPartID === partID.trim()) {
        // Get current seasons
        const currentSeasons = data[i][seasonsCol] ? data[i][seasonsCol].toString() : '';
        let seasonsList = currentSeasons ? currentSeasons.split(',').map(s => s.trim()).filter(s => s !== '') : [];

        // Add or remove season
        if (action === 'add') {
          if (!seasonsList.includes(season.trim())) {
            seasonsList.push(season.trim());
          }
        } else if (action === 'remove') {
          seasonsList = seasonsList.filter(s => s !== season.trim());
        }

        // Join back to comma-separated string
        const updatedSeasons = seasonsList.join(', ');

        // Update the cell
        sheet.getRange(i + 1, seasonsCol + 1).setValue(updatedSeasons);

        // Clear cache
        const cache = CacheService.getScriptCache();
        cache.removeAll(['specConfig_', 'specValues_']);

        return {
          success: true,
          message: 'Seasons updated successfully',
          seasons: updatedSeasons
        };
      }
    }

    return {
      success: false,
      message: 'Part ID not found: ' + partID
    };
  } catch (error) {
    Logger.log('Error in updatePartSeasons: ' + error.toString());
    return {
      success: false,
      message: 'Failed to update seasons: ' + error.message
    };
  }
}

/**
 * Gets the list of students from the roster
 * @returns {Array<string>} Sorted array of student names
 */
function getStudents() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.STUDENTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Students sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const students = [];

    // Assuming first column contains student names, skip header
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        students.push(data[i][0].toString().trim());
      }
    }

    return students.sort();
  } catch (error) {
    Logger.log('Error in getStudents: ' + error.toString());
    throw new Error('Failed to retrieve student list: ' + error.message);
  }
}

/**
 * Gets unique list of subteams
 * @returns {Array} Sorted array of subteam names
 */
function getSubteams() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.STUDENTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Students sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const subteams = new Set();

    // Assuming column B (index 1) contains subteam
    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) {
        subteams.add(data[i][1].toString().trim());
      }
    }

    return Array.from(subteams).sort();
  } catch (error) {
    Logger.log('Error in getSubteams: ' + error.toString());
    throw new Error('Failed to retrieve subteam list: ' + error.message);
  }
}

/**
 * Gets students filtered by subteam
 * @param {string} subteam - The subteam to filter by
 * @returns {Array} Sorted array of student names
 */
function getStudentsBySubteam(subteam) {
  try {
    if (!subteam) {
      return [];
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.STUDENTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Students sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const students = [];

    // Column A (index 0) = Name, Column B (index 1) = Subteam
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim() === subteam && data[i][0]) {
        students.push(data[i][0].toString().trim());
      }
    }

    return students.sort();
  } catch (error) {
    Logger.log('Error in getStudentsBySubteam: ' + error.toString());
    throw new Error('Failed to retrieve students for subteam: ' + error.message);
  }
}

/**
 * Submits a new parts order
 * New 20-column structure: Order #, Date, Department, Name, Part ID, Part Name, Category,
 * Quantity Requested, Priority, Unit Cost, Total Cost, Supplier, Supplier Link, Product Code,
 * Status, Notes, Justification, CSV File Link, Monday ID, Monday Subitem ID
 * @param {Object} orderData - Object containing order details
 * @returns {Object} Success status and order number
 */
function submitOrder(orderData) {
  try {
    // Validate order data
    if (!orderData || !orderData.studentName) {
      throw new Error('Invalid order data provided');
    }

    const isCSVOrder = orderData.csvFileLink ? true : false;

    // For regular orders, require items
    if (!isCSVOrder && (!orderData.items || orderData.items.length === 0)) {
      throw new Error('Invalid order data provided');
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!ordersSheet) {
      throw new Error('Orders sheet not found');
    }

    const orderNumber = getNextOrderNumber();
    const timestamp = new Date();
    const totalCost = orderData.totalCost || 0;
    const priority = orderData.priority || 'Medium';
    const department = orderData.department || '';
    const justification = orderData.justification || '';
    const notes = orderData.notes || '';

    // Prepare rows for each item in the order
    // 20 columns: Order #, Date, Department, Name, Part ID, Part Name, Category,
    // Quantity Requested, Priority, Unit Cost, Total Cost, Supplier, Supplier Link, Product Code,
    // Status, Notes, Justification, CSV File Link, Monday ID, Monday Subitem ID
    const rows = [];

    if (isCSVOrder) {
      // CSV orders: single row with special values
      rows.push([
        orderNumber,                           // 1. Order #
        timestamp,                             // 2. Date
        department,                            // 3. Department
        orderData.studentName,                 // 4. Name
        'CSV-ORDER',                           // 5. Part ID
        'WCP CSV Order',                       // 6. Part Name
        'WCP Import',                          // 7. Category
        1,                                     // 8. Quantity Requested
        priority,                              // 9. Priority
        0,                                     // 10. Unit Cost
        0,                                     // 11. Total Cost
        'WCP',                                 // 12. Supplier
        'https://wcproducts.com/apps/quick-order', // 13. Supplier Link
        'CSV-ORDER',                           // 14. Product Code
        'Pending',                             // 15. Status
        notes,                                 // 16. Notes
        'CSV order - no justification',       // 17. Justification
        orderData.csvFileLink,                 // 18. CSV File Link
        '',                                    // 19. Monday ID - populated by Zapier
        ''                                     // 20. Monday Subitem ID - populated by Zapier
      ]);
    } else {
      // Regular orders: one row per item
      for (const item of orderData.items) {
        // Lookup part details from Parts Directory
        const partDetails = getPartDetailsForOrder(item.partID);

        rows.push([
          orderNumber,                           // 1. Order #
          timestamp,                             // 2. Date
          department,                            // 3. Department
          orderData.studentName,                 // 4. Name
          item.partID,                           // 5. Part ID
          item.partName,                         // 6. Part Name
          item.category,                         // 7. Category
          parseInt(item.quantity) || 0,          // 8. Quantity Requested
          priority,                              // 9. Priority
          parseFloat(item.unitCost) || 0,        // 10. Unit Cost
          parseFloat(item.totalCost) || 0,       // 11. Total Cost
          partDetails.supplier,                  // 12. Supplier
          partDetails.supplierLink,              // 13. Supplier Link
          partDetails.productCode,               // 14. Product Code
          'Pending',                             // 15. Status
          notes,                                 // 16. Notes
          justification,                         // 17. Justification
          '',                                    // 18. CSV File Link (empty for regular)
          '',                                    // 19. Monday ID - populated by Zapier
          ''                                     // 20. Monday Subitem ID - populated by Zapier
        ]);
      }
    }

    // Append all rows at once
    if (rows.length > 0) {
      ordersSheet.getRange(ordersSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // Update inventory quantities in Parts Directory (skip for CSV orders)
    if (!isCSVOrder) {
      updateInventoryQuantities(orderData.items);
    }

    return {
      success: true,
      orderNumber: orderNumber,
      message: 'Order submitted successfully'
    };
  } catch (error) {
    Logger.log('Error in submitOrder: ' + error.toString());
    return {
      success: false,
      message: 'Failed to submit order: ' + error.message
    };
  }
}

/**
 * Submits a custom part request
 * New 20-column structure: Order #, Date, Department, Name, Part ID, Part Name, Category,
 * Quantity Requested, Priority, Unit Cost, Total Cost, Supplier, Supplier Link, Product Code,
 * Status, Notes, Justification, CSV File Link, Monday ID, Monday Subitem ID
 * @param {Object} requestData - Custom request data
 * @returns {Object} Result with success status and request ID
 */
function submitCustomRequest(requestData) {
  try {
    // Validate request data
    if (!requestData || !requestData.studentName || !requestData.partName) {
      throw new Error('Invalid request data provided');
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!ordersSheet) {
      throw new Error('Orders sheet not found');
    }

    // Generate unique custom request ID
    const orderNumber = getNextOrderNumber();
    const customID = getNextCustomRequestID();
    const timestamp = new Date();
    const estimatedCost = requestData.estimatedCost || 0;
    const priority = requestData.priority || 'Medium';
    const department = requestData.department || '';
    const supplier = requestData.whereToBuy || '';
    const supplierLink = requestData.partLink || '';
    const justification = requestData.justification || '';

    // Create order row with 20 columns
    // Order #, Date, Department, Name, Part ID, Part Name, Category,
    // Quantity Requested, Priority, Unit Cost, Total Cost, Supplier, Supplier Link, Product Code,
    // Status, Notes, Justification, CSV File Link, Monday ID, Monday Subitem ID
    const row = [
      orderNumber,                    // 1. Order #
      timestamp,                      // 2. Date
      department,                     // 3. Department
      requestData.studentName,        // 4. Name
      customID,                       // 5. Part ID
      requestData.partName,           // 6. Part Name
      'Custom Request',               // 7. Category
      1,                              // 8. Quantity Requested (always 1 for custom)
      priority,                       // 9. Priority
      estimatedCost,                  // 10. Unit Cost
      estimatedCost,                  // 11. Total Cost (unit cost * 1)
      supplier,                       // 12. Supplier (from whereToBuy field)
      supplierLink,                   // 13. Supplier Link (from partLink field)
      'N/A',                          // 14. Product Code (N/A for custom requests)
      'Pending',                      // 15. Status
      'CUSTOM REQUEST',               // 16. Notes
      justification,                  // 17. Justification
      '',                             // 18. CSV File Link (empty for custom)
      '',                             // 19. Monday ID - populated by Zapier
      ''                              // 20. Monday Subitem ID - populated by Zapier
    ];

    // Append row
    ordersSheet.appendRow(row);

    return {
      success: true,
      requestID: customID,
      orderNumber: orderNumber,
      message: 'Custom request submitted successfully'
    };
  } catch (error) {
    Logger.log('Error in submitCustomRequest: ' + error.toString());
    return {
      success: false,
      message: 'Failed to submit custom request: ' + error.message
    };
  }
}

/**
 * Gets part details from Parts Directory for order submission
 * Looks up Supplier, Supplier Link (Order Link), and Product Code by Part ID
 * @param {string} partID - The Part ID to look up
 * @returns {Object} Object containing supplier, supplierLink, and productCode
 */
function getPartDetailsForOrder(partID) {
  try {
    if (!partID) {
      return { supplier: '', supplierLink: '', productCode: '' };
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      Logger.log('Parts sheet not found in getPartDetailsForOrder');
      return { supplier: '', supplierLink: '', productCode: '' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices
    const partIDCol = headers.indexOf('Part ID');
    const supplierCol = headers.indexOf('Supplier');
    const orderLinkCol = headers.indexOf('Order Link');
    const productCodeCol = headers.indexOf('Product Code');

    if (partIDCol === -1) {
      Logger.log('Part ID column not found in getPartDetailsForOrder');
      return { supplier: '', supplierLink: '', productCode: '' };
    }

    // Find the matching part
    for (let i = 1; i < data.length; i++) {
      if (data[i][partIDCol] && data[i][partIDCol].toString().trim() === partID.trim()) {
        return {
          supplier: supplierCol !== -1 && data[i][supplierCol] ? data[i][supplierCol].toString().trim() : '',
          supplierLink: orderLinkCol !== -1 && data[i][orderLinkCol] ? data[i][orderLinkCol].toString().trim() : '',
          productCode: productCodeCol !== -1 && data[i][productCodeCol] ? data[i][productCodeCol].toString().trim() : ''
        };
      }
    }

    // Part ID not found
    Logger.log('Part ID not found in Parts Directory: ' + partID);
    return { supplier: '', supplierLink: '', productCode: '' };
  } catch (error) {
    Logger.log('Error in getPartDetailsForOrder: ' + error.toString());
    return { supplier: '', supplierLink: '', productCode: '' };
  }
}

/**
 * Gets the next custom request ID
 * @returns {string} Next custom request ID (e.g., "CUSTOM-001")
 */
function getNextCustomRequestID() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const ordersSheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!ordersSheet) {
      return 'CUSTOM-001';
    }

    const data = ordersSheet.getDataRange().getValues();
    let maxCustomNum = 0;

    // Find highest CUSTOM-### number
    // Part ID is column index 4 (Department column is index 2)
    for (let i = 1; i < data.length; i++) {
      const partID = data[i][4]; // Part ID column (0-indexed: Order #, Date, Department, Name, Part ID)
      if (partID && partID.toString().startsWith('CUSTOM-')) {
        const numStr = partID.toString().replace('CUSTOM-', '');
        const num = parseInt(numStr);
        if (!isNaN(num) && num > maxCustomNum) {
          maxCustomNum = num;
        }
      }
    }

    // Generate next ID
    const nextNum = maxCustomNum + 1;
    return 'CUSTOM-' + nextNum.toString().padStart(3, '0');
  } catch (error) {
    Logger.log('Error in getNextCustomRequestID: ' + error.toString());
    return 'CUSTOM-001';
  }
}

/**
 * Updates inventory quantities after an order is placed
 * @param {Array<Object>} items - Array of ordered items
 */
function updateInventoryQuantities(items) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const partIDCol = headers.indexOf('Part ID');
    const quantityCol = headers.indexOf('Quantity in Stock');

    if (partIDCol === -1 || quantityCol === -1) {
      throw new Error('Required columns not found');
    }

    // Create a map of part IDs to ordered quantities
    const orderQuantities = {};
    for (const item of items) {
      orderQuantities[item.partID] = (orderQuantities[item.partID] || 0) + parseInt(item.quantity);
    }

    // Update quantities
    for (let i = 1; i < data.length; i++) {
      const partID = data[i][partIDCol];
      if (partID && orderQuantities[partID]) {
        const currentQty = parseInt(data[i][quantityCol]) || 0;
        const newQty = Math.max(0, currentQty - orderQuantities[partID]);
        sheet.getRange(i + 1, quantityCol + 1).setValue(newQty);
      }
    }
  } catch (error) {
    Logger.log('Error in updateInventoryQuantities: ' + error.toString());
    // Don't throw error to prevent order submission failure
  }
}

/**
 * Submits a request for a new part to be added to inventory
 * @param {Object} partData - Object containing new part request details
 * @returns {Object} Success status and message
 */
function submitNewPartRequest(partData) {
  try {
    // Validate part data
    if (!partData || !partData.partName || !partData.category) {
      throw new Error('Invalid part data provided');
    }

    // Check for duplicates
    const duplicateCheck = checkForDuplicates(partData.partName);
    if (!duplicateCheck.isUnique) {
      return {
        success: false,
        message: 'A similar part already exists: ' + duplicateCheck.existingPart,
        isDuplicate: true
      };
    }

    // Add the part to directory
    const result = addPartToDirectory(partData);

    return result;
  } catch (error) {
    Logger.log('Error in submitNewPartRequest: ' + error.toString());
    return {
      success: false,
      message: 'Failed to submit part request: ' + error.message
    };
  }
}

/**
 * Adds a new part to the parts directory
 * @param {Object} partData - Object containing part details (including inventory and seasons)
 * @returns {Object} Success status, part ID, and message
 */
function addPartToDirectory(partData) {
  try {
    // Extract inventory and seasons from partData
    const inventory = partData.inventory || false;
    const seasons = partData.seasons || '';

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    // Generate new Part ID
    const partID = generatePartID(partData.category);

    // Prepare the new row matching Parts sheet structure (22 columns):
    // Part ID, Part Name, Category, Subcategory, Type, Product Code,
    // Spec 1, Spec 2, Spec 3, Spec 4, Spec 5,
    // Quantity Per, Cost, Supplier, Order Link, Location/Bin, Notes,
    // Status, Date Added, Added By, Inventory, Seasons
    const newRow = [
      partID,                                       // 1. Part ID
      partData.partName,                            // 2. Part Name
      partData.category,                            // 3. Category
      partData.subcategory || '',                   // 4. Subcategory
      partData.type || '',                          // 5. Type
      partData.productCode || '',                   // 6. Product Code
      partData.spec1 || '-',                        // 7. Spec 1
      partData.spec2 || '-',                        // 8. Spec 2
      partData.spec3 || '-',                        // 9. Spec 3
      partData.spec4 || '-',                        // 10. Spec 4
      partData.spec5 || '-',                        // 11. Spec 5
      parseInt(partData.quantity) || 0,             // 12. Quantity Per
      parseFloat(partData.unitCost) || 0,           // 13. Cost
      partData.supplier || '',                      // 14. Supplier
      partData.supplierPartNumber || '',            // 15. Order Link
      partData.storageLocation || '',               // 16. Location/Bin
      partData.notes || '',                         // 17. Notes
      'Active',                                     // 18. Status
      new Date(),                                   // 19. Date Added
      Session.getActiveUser().getEmail() || 'System', // 20. Added By
      inventory ? 'Yes' : 'No',                     // 21. Inventory
      seasons || ''                                 // 22. Seasons
    ];

    // Append the new part
    sheet.appendRow(newRow);

    return {
      success: true,
      partID: partID,
      message: 'Part added successfully with ID: ' + partID
    };
  } catch (error) {
    Logger.log('Error in addPartToDirectory: ' + error.toString());
    return {
      success: false,
      message: 'Failed to add part: ' + error.message
    };
  }
}

/**
 * Generates a sequential Part ID based on category
 * Format: CODE-XXX (e.g., STOCK-001, FAST-015)
 * Uses the Code from the Categories sheet, not derived from category name
 * @param {string} category - The category name for the part
 * @returns {string} The generated Part ID
 */
function generatePartID(category) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);

    // First, get the category code from the Categories sheet
    const categoriesSheet = ss.getSheetByName('Categories');
    if (!categoriesSheet) {
      throw new Error('Categories sheet not found');
    }

    const categoriesData = categoriesSheet.getDataRange().getValues();
    const categoriesHeaders = categoriesData[0];
    const categoryNameCol = categoriesHeaders.indexOf('Category Name');
    const codeCol = categoriesHeaders.indexOf('Code');

    if (categoryNameCol === -1 || codeCol === -1) {
      throw new Error('Category Name or Code column not found in Categories sheet');
    }

    // Find the code for this category
    let prefix = '';
    for (let i = 1; i < categoriesData.length; i++) {
      if (categoriesData[i][categoryNameCol] &&
          categoriesData[i][categoryNameCol].toString().trim() === category) {
        prefix = categoriesData[i][codeCol] ? categoriesData[i][codeCol].toString().trim() : '';
        break;
      }
    }

    if (!prefix) {
      throw new Error('Category "' + category + '" not found in Categories sheet');
    }

    // Get all existing Part IDs from Parts sheet
    const partsSheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);
    if (!partsSheet) {
      throw new Error('Parts sheet not found');
    }

    const partsData = partsSheet.getDataRange().getValues();
    const partsHeaders = partsData[0];
    const partIDCol = partsHeaders.indexOf('Part ID');

    if (partIDCol === -1) {
      throw new Error('Part ID column not found');
    }

    // Find highest number for this category prefix
    let maxNumber = 0;
    const prefixPattern = new RegExp('^' + prefix + '-(\\d+)$');

    for (let i = 1; i < partsData.length; i++) {
      const partID = partsData[i][partIDCol];
      if (partID) {
        const match = partID.toString().match(prefixPattern);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    }

    // Generate next sequential number
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return prefix + '-' + nextNumber;
  } catch (error) {
    Logger.log('Error in generatePartID: ' + error.toString());
    throw new Error('Failed to generate Part ID: ' + error.message);
  }
}

/**
 * Checks if a part name already exists in the directory
 * @param {string} partName - The part name to check
 * @returns {Object} Object with isUnique flag and existing part info if found
 */
function checkForDuplicates(partName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const partNameCol = headers.indexOf('Part Name');
    const partIDCol = headers.indexOf('Part ID');

    if (partNameCol === -1) {
      throw new Error('Part Name column not found');
    }

    const searchName = partName.toLowerCase().trim();

    // Check for exact or similar matches
    for (let i = 1; i < data.length; i++) {
      const existingName = data[i][partNameCol];
      if (existingName) {
        const existingNameLower = existingName.toString().toLowerCase().trim();

        // Check for exact match or high similarity
        if (existingNameLower === searchName) {
          const existingPartID = data[i][partIDCol] || 'Unknown';
          return {
            isUnique: false,
            existingPart: existingName + ' (' + existingPartID + ')'
          };
        }

        // Check for substring match (potential duplicate)
        if (existingNameLower.includes(searchName) || searchName.includes(existingNameLower)) {
          if (searchName.length > 5 && existingNameLower.length > 5) {
            const existingPartID = data[i][partIDCol] || 'Unknown';
            return {
              isUnique: false,
              existingPart: existingName + ' (' + existingPartID + ')',
              warning: 'Similar part found'
            };
          }
        }
      }
    }

    return { isUnique: true };
  } catch (error) {
    Logger.log('Error in checkForDuplicates: ' + error.toString());
    // Return true to allow operation to continue
    return { isUnique: true };
  }
}

// ===== BULK IMPORT FUNCTIONS =====

/**
 * Gets all existing Category/Subcategory/Type combinations from Parts Directory
 * Used to populate the "Available Options" tab in bulk import template
 * @returns {Array<Object>} Array of {category, subcategory, type} objects
 */
function getExistingCombinations() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const categoryCol = headers.indexOf('Category');
    const subcategoryCol = headers.indexOf('Subcategory');
    const typeCol = headers.indexOf('Type');

    if (categoryCol === -1 || subcategoryCol === -1 || typeCol === -1) {
      throw new Error('Required columns not found');
    }

    const combinations = [];
    const seen = new Set();

    for (let i = 1; i < data.length; i++) {
      const category = data[i][categoryCol] ? data[i][categoryCol].toString().trim() : '';
      const subcategory = data[i][subcategoryCol] ? data[i][subcategoryCol].toString().trim() : '';
      const type = data[i][typeCol] ? data[i][typeCol].toString().trim() : '';

      if (category && subcategory && type) {
        const key = category + '|' + subcategory + '|' + type;
        if (!seen.has(key)) {
          seen.add(key);
          combinations.push({
            category: category,
            subcategory: subcategory,
            type: type
          });
        }
      }
    }

    combinations.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.subcategory !== b.subcategory) return a.subcategory.localeCompare(b.subcategory);
      return a.type.localeCompare(b.type);
    });

    return combinations;
  } catch (error) {
    Logger.log('Error in getExistingCombinations: ' + error.toString());
    return [];
  }
}

/**
 * Creates a new Google Sheets template for bulk part import
 * Template includes: Parts to Import tab, Available Options tab, Valid Categories tab, Instructions tab
 * @returns {Object} Result with templateUrl, templateId, and success status
 */
function createBulkImportTemplate() {
  try {
    const templateName = 'Parts Bulk Import Template - ' + new Date().toLocaleDateString();
    const ss = SpreadsheetApp.create(templateName);
    const ssId = ss.getId();

    ss.getSheets()[0].setName('Parts to Import');
    const importSheet = ss.getSheetByName('Parts to Import');

    const headers = [
      'Part Name*', 'Category*', 'Subcategory*', 'Type*', 'Product Code',
      'Spec 1', 'Spec 2', 'Spec 3', 'Spec 4', 'Spec 5',
      'Quantity Per*', 'Cost*', 'Supplier*', 'Order Link*', 'Notes',
      'Inventory', 'Seasons'
    ];
    importSheet.appendRow(headers);

    const headerRange = importSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#461D7C');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);
    importSheet.setFrozenRows(1);

    const requiredCols = [1, 2, 3, 4, 11, 12, 13, 14];
    requiredCols.forEach(col => {
      importSheet.getRange(1, col).setBackground('#FDD023');
      importSheet.getRange(1, col).setFontColor('#000000');
    });

    const exampleRow = [
      'Socket Head Cap Screw', 'Fasteners', 'Screws', 'Socket Head', 'SH-832-050',
      '8-32', '0.5"', '-', '-', '-',
      '100', '8.99', 'McMaster-Carr', 'https://www.mcmaster.com', 'Standard stainless steel',
      'No', ''
    ];
    importSheet.appendRow(exampleRow);
    importSheet.getRange(2, 1, 1, headers.length).setBackground('#E8F5E9');

    const categories = getCategories();
    const categoryValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(categories, true)
      .setAllowInvalid(false)
      .build();
    importSheet.getRange(2, 2, 998, 1).setDataValidation(categoryValidation);

    const inventoryValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Yes', 'No'], true)
      .setAllowInvalid(false)
      .build();
    importSheet.getRange(2, 16, 998, 1).setDataValidation(inventoryValidation);

    for (let i = 1; i <= headers.length; i++) {
      importSheet.autoResizeColumn(i);
    }

    const optionsSheet = ss.insertSheet('Available Options', 1);
    optionsSheet.appendRow(['Category', 'Subcategory', 'Type']);
    const optionsHeaderRange = optionsSheet.getRange(1, 1, 1, 3);
    optionsHeaderRange.setBackground('#461D7C');
    optionsHeaderRange.setFontColor('#FFFFFF');
    optionsHeaderRange.setFontWeight('bold');
    optionsSheet.setFrozenRows(1);

    optionsSheet.getRange(2, 1, 1, 3).setValues([[
      'Use Ctrl+F to search. These are existing combinations in your system.',
      'You can add new Subcategories/Types, but Categories must match exactly.',
      ''
    ]]);
    optionsSheet.getRange(2, 1, 1, 3).setBackground('#FFF3CD').setFontStyle('italic');

    const combinations = getExistingCombinations();
    if (combinations.length > 0) {
      const optionsData = combinations.map(c => [c.category, c.subcategory, c.type]);
      optionsSheet.getRange(3, 1, optionsData.length, 3).setValues(optionsData);
    }

    for (let i = 1; i <= 3; i++) {
      optionsSheet.autoResizeColumn(i);
    }

    const categoriesSheet = ss.insertSheet('Valid Categories', 2);
    categoriesSheet.hideSheet();
    categoriesSheet.appendRow(['Category']);
    categories.forEach(cat => categoriesSheet.appendRow([cat]));

    const instructionsSheet = ss.insertSheet('Instructions', 3);
    instructionsSheet.appendRow(['BULK IMPORT INSTRUCTIONS']);
    instructionsSheet.getRange(1, 1).setFontSize(14).setFontWeight('bold').setBackground('#461D7C').setFontColor('#FFFFFF');

    const instructions = [
      [''],
      ['HOW TO USE THIS TEMPLATE:'],
      ['1. File → Make a Copy (do not edit this template directly)'],
      ['2. Review the "Available Options" tab to see existing Category/Subcategory/Type combinations'],
      ['3. Fill out the "Parts to Import" tab with your parts (delete the example row)'],
      ['4. Required fields are marked with * and highlighted in gold'],
      ['5. Category dropdown only allows existing categories (no new categories)'],
      ['6. Subcategory and Type are free text, but use existing options when possible'],
      ['7. Copy your sheet URL when done'],
      ['8. Return to the web app and paste the URL to import'],
      [''],
      ['REQUIRED FIELDS (must be filled):'],
      ['- Part Name, Category, Subcategory, Type'],
      ['- Quantity Per, Cost, Supplier, Order Link'],
      [''],
      ['OPTIONAL FIELDS:'],
      ['- Product Code, Spec 1-5, Notes, Inventory, Seasons'],
      [''],
      ['AUTO-GENERATED FIELDS (do not include):'],
      ['- Part ID (system generates unique IDs)'],
      ['- Status (always set to "Active")'],
      ['- Date Added, Added By (automatically recorded)'],
      [''],
      ['TIPS:'],
      ['- Use Ctrl+F in "Available Options" to search for existing options'],
      ['- You can add multiple parts (up to 500 rows)'],
      ['- Invalid rows will be flagged during import preview'],
      ['- Only valid rows will be imported']
    ];
    instructionsSheet.getRange(2, 1, instructions.length, 1).setValues(instructions);
    instructionsSheet.getRange(3, 1).setFontWeight('bold').setFontSize(12);
    instructionsSheet.getRange(13, 1).setFontWeight('bold').setFontSize(11);
    instructionsSheet.getRange(18, 1).setFontWeight('bold').setFontSize(11);
    instructionsSheet.getRange(23, 1).setFontWeight('bold').setFontSize(11);
    instructionsSheet.getRange(28, 1).setFontWeight('bold').setFontSize(11);
    instructionsSheet.autoResizeColumn(1);

    const file = DriveApp.getFileById(ssId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      templateUrl: ss.getUrl(),
      templateId: ssId,
      message: 'Template created successfully'
    };
  } catch (error) {
    Logger.log('Error in createBulkImportTemplate: ' + error.toString());
    return {
      success: false,
      message: 'Failed to create template: ' + error.message
    };
  }
}

/**
 * Extracts Sheet ID from various Google Sheets URL formats
 * @param {string} url - Google Sheets URL
 * @returns {string|null} Sheet ID or null if invalid
 */
function extractSheetIdFromUrl(url) {
  try {
    if (!url || typeof url !== 'string') return null;

    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,
      /key=([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  } catch (error) {
    Logger.log('Error extracting sheet ID: ' + error.toString());
    return null;
  }
}

/**
 * Reads data from a user's filled import sheet
 * @param {string} sheetUrl - URL of the Google Sheet to import
 * @returns {Object} Result with partsData array and metadata
 */
function readSheetForImport(sheetUrl) {
  try {
    const sheetId = extractSheetIdFromUrl(sheetUrl);

    if (!sheetId) {
      return {
        success: false,
        message: 'Invalid Google Sheets URL. Please check the URL and try again.'
      };
    }

    let ss;
    try {
      ss = SpreadsheetApp.openById(sheetId);
    } catch (e) {
      return {
        success: false,
        message: 'Unable to access this sheet. Please ensure the sheet is shared with "Anyone with the link" (View access).'
      };
    }

    const sheet = ss.getSheetByName('Parts to Import');
    if (!sheet) {
      return {
        success: false,
        message: 'Sheet must have a tab named "Parts to Import". Please use the template provided.'
      };
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return {
        success: false,
        message: 'No data found in the sheet. Please add parts to import.'
      };
    }

    const headers = data[0];
    const expectedHeaders = [
      'Part Name*', 'Category*', 'Subcategory*', 'Type*', 'Product Code',
      'Spec 1', 'Spec 2', 'Spec 3', 'Spec 4', 'Spec 5',
      'Quantity Per*', 'Cost*', 'Supplier*', 'Order Link*', 'Notes',
      'Inventory', 'Seasons'
    ];

    const partsData = [];
    for (let i = 1; i < data.length && i < 501; i++) {
      const row = data[i];

      if (!row[0] || row[0].toString().trim() === '') {
        continue;
      }

      partsData.push({
        rowNumber: i + 1,
        partName: row[0] ? row[0].toString().trim() : '',
        category: row[1] ? row[1].toString().trim() : '',
        subcategory: row[2] ? row[2].toString().trim() : '',
        type: row[3] ? row[3].toString().trim() : '',
        productCode: row[4] ? row[4].toString().trim() : '',
        spec1: row[5] ? row[5].toString().trim() : '-',
        spec2: row[6] ? row[6].toString().trim() : '-',
        spec3: row[7] ? row[7].toString().trim() : '-',
        spec4: row[8] ? row[8].toString().trim() : '-',
        spec5: row[9] ? row[9].toString().trim() : '-',
        quantity: row[10],
        unitCost: row[11],
        supplier: row[12] ? row[12].toString().trim() : '',
        supplierPartNumber: row[13] ? row[13].toString().trim() : '',
        notes: row[14] ? row[14].toString().trim() : '',
        inventory: row[15] && row[15].toString().trim().toLowerCase() === 'yes',
        seasons: row[16] ? row[16].toString().trim() : ''
      });
    }

    if (partsData.length === 0) {
      return {
        success: false,
        message: 'No valid rows found. Make sure Part Name column has data.'
      };
    }

    return {
      success: true,
      partsData: partsData,
      rowCount: partsData.length,
      message: 'Successfully read ' + partsData.length + ' rows from sheet'
    };
  } catch (error) {
    Logger.log('Error in readSheetForImport: ' + error.toString());
    return {
      success: false,
      message: 'Error reading sheet: ' + error.message
    };
  }
}

/**
 * Validates bulk import data from sheet
 * Checks required fields, data types, categories, and duplicates
 * @param {Array<Object>} partsArray - Array of part objects to validate
 * @returns {Object} Validation results with valid, invalid, and warning arrays
 */
function validateBulkImportData(partsArray) {
  try {
    const validCategories = getCategories();
    const validParts = [];
    const invalidParts = [];
    const warnings = [];

    for (const part of partsArray) {
      const errors = [];
      const partWarnings = [];

      if (!part.partName || part.partName.trim() === '') {
        errors.push('Part Name is required');
      }

      if (!part.category || part.category.trim() === '') {
        errors.push('Category is required');
      } else if (!validCategories.includes(part.category)) {
        errors.push('Category "' + part.category + '" does not exist. Must use existing category.');
      }

      if (!part.subcategory || part.subcategory.trim() === '') {
        errors.push('Subcategory is required');
      }

      if (!part.type || part.type.trim() === '') {
        errors.push('Type is required');
      }

      if (!part.supplier || part.supplier.trim() === '') {
        errors.push('Supplier is required');
      }

      if (!part.supplierPartNumber || part.supplierPartNumber.trim() === '') {
        errors.push('Order Link is required');
      }

      const quantity = parseFloat(part.quantity);
      if (isNaN(quantity) || quantity < 0) {
        errors.push('Quantity Per must be a number >= 0');
      }

      const cost = parseFloat(part.unitCost);
      if (isNaN(cost) || cost < 0) {
        errors.push('Cost must be a number >= 0');
      }

      if (errors.length === 0) {
        const duplicateCheck = checkForDuplicates(part.partName);
        if (duplicateCheck && !duplicateCheck.isUnique) {
          partWarnings.push('Part name may be a duplicate');
        }

        if (quantity === 0) {
          partWarnings.push('Quantity is 0');
        }

        validParts.push({
          ...part,
          quantity: quantity,
          unitCost: cost,
          warnings: partWarnings
        });

        if (partWarnings.length > 0) {
          warnings.push({
            rowNumber: part.rowNumber,
            partName: part.partName,
            warnings: partWarnings
          });
        }
      } else {
        invalidParts.push({
          rowNumber: part.rowNumber,
          partName: part.partName,
          category: part.category,
          subcategory: part.subcategory,
          type: part.type,
          errors: errors
        });
      }
    }

    return {
      success: true,
      validParts: validParts,
      invalidParts: invalidParts,
      warnings: warnings,
      summary: {
        total: partsArray.length,
        valid: validParts.length,
        invalid: invalidParts.length,
        warnings: warnings.length
      }
    };
  } catch (error) {
    Logger.log('Error in validateBulkImportData: ' + error.toString());
    return {
      success: false,
      message: 'Error validating data: ' + error.message
    };
  }
}

/**
 * Imports validated parts in bulk to the Parts Directory
 * @param {Array<Object>} validatedParts - Array of validated part objects
 * @returns {Object} Import results with success/failure details
 */
function bulkImportPartsFromSheet(validatedParts) {
  try {
    const imported = [];
    const failed = [];

    for (const part of validatedParts) {
      try {
        const result = addPartToDirectory(part);

        if (result.success) {
          imported.push({
            rowNumber: part.rowNumber,
            partName: part.partName,
            partID: result.partID
          });
        } else {
          failed.push({
            rowNumber: part.rowNumber,
            partName: part.partName,
            error: result.message
          });
        }
      } catch (error) {
        failed.push({
          rowNumber: part.rowNumber,
          partName: part.partName,
          error: error.message
        });
      }
    }

    return {
      success: true,
      imported: imported,
      failed: failed,
      summary: {
        successCount: imported.length,
        failCount: failed.length
      }
    };
  } catch (error) {
    Logger.log('Error in bulkImportPartsFromSheet: ' + error.toString());
    return {
      success: false,
      message: 'Error during import: ' + error.message
    };
  }
}

/**
 * Generates the next sequential order number
 * Format: ORD-YYYYMMDD-XXX (e.g., ORD-20250127-001)
 * @returns {string} The generated order number
 */
function getNextOrderNumber() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Orders sheet not found');
    }

    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    const prefix = 'ORD-' + dateStr + '-';

    // Get all existing order numbers
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orderNumCol = headers.indexOf('Order #');

    if (orderNumCol === -1) {
      // If column not found, return first order of the day
      Logger.log('Warning: Order # column not found in Orders sheet');
      return prefix + '001';
    }

    // Find highest sequence number for today
    let maxSequence = 0;
    const prefixPattern = new RegExp('^' + prefix.replace(/[-]/g, '\\-') + '(\\d+)$');

    for (let i = 1; i < data.length; i++) {
      const orderNum = data[i][orderNumCol];
      if (orderNum) {
        const match = orderNum.toString().match(prefixPattern);
        if (match) {
          const seq = parseInt(match[1]);
          if (seq > maxSequence) {
            maxSequence = seq;
          }
        }
      }
    }

    // Generate next sequential number
    const nextSequence = (maxSequence + 1).toString().padStart(3, '0');
    return prefix + nextSequence;
  } catch (error) {
    Logger.log('Error in getNextOrderNumber: ' + error.toString());
    // Return a fallback order number
    const now = new Date();
    const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    return 'ORD-' + dateStr + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }
}

/**
 * Validates the access password for adding parts
 * @param {string} password - The password to validate
 * @returns {Object} Object with isValid flag
 */
function validateAccess(password) {
  try {
    const isValid = password === CONFIG.ADD_PART_PASSWORD;
    return { isValid: isValid };
  } catch (error) {
    Logger.log('Error in validateAccess: ' + error.toString());
    return { isValid: false };
  }
}

/**
 * Creates or retrieves the WCP Orders folder in Google Drive
 * @returns {string} Folder ID
 */
function createWCPOrdersFolder() {
  try {
    const folders = DriveApp.getFoldersByName('WCP Orders');
    if (folders.hasNext()) {
      return folders.next().getId();
    }

    const folder = DriveApp.createFolder('WCP Orders');
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return folder.getId();
  } catch (error) {
    Logger.log('Error creating WCP Orders folder: ' + error.toString());
    throw new Error('Failed to create Drive folder: ' + error.message);
  }
}

/**
 * Uploads a CSV file to the WCP Orders folder in Google Drive
 * @param {string} fileContent - Base64-encoded or plain text CSV content
 * @param {string} fileName - Original filename from user
 * @param {string} orderNumber - Order number for filename
 * @returns {Object} Result object with success status and file info
 */
function uploadCSVToDrive(fileContent, fileName, orderNumber) {
  try {
    const folderId = createWCPOrdersFolder();
    const folder = DriveApp.getFolderById(folderId);

    let csvData = fileContent;
    if (fileContent.includes('base64,')) {
      const base64Data = fileContent.split('base64,')[1];
      csvData = Utilities.newBlob(Utilities.base64Decode(base64Data)).getDataAsString();
    }

    const standardFileName = 'WCP_Order_' + orderNumber + '.csv';

    const file = folder.createFile(standardFileName, csvData, MimeType.CSV);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: standardFileName
    };
  } catch (error) {
    Logger.log('Error uploading CSV to Drive: ' + error.toString());
    return {
      success: false,
      message: 'Failed to upload file: ' + error.message
    };
  }
}

/**
 * Gets specifications options for a given category and subcategory
 * Used for the Add Part form to show existing specifications
 * @param {string} category - The category to filter by
 * @param {string} subcategory - The subcategory to filter by
 * @returns {Array<string>} Array of unique specifications
 */
function getSpecifications(category, subcategory) {
  try {
    if (!category || !subcategory) {
      return [];
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const categoryCol = headers.indexOf('Category');
    const subcategoryCol = headers.indexOf('Subcategory');
    const specificationsCol = headers.indexOf('Specifications');

    if (categoryCol === -1 || subcategoryCol === -1 || specificationsCol === -1) {
      return [];
    }

    const specifications = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][categoryCol] &&
          data[i][categoryCol].toString().trim() === category &&
          data[i][subcategoryCol] &&
          data[i][subcategoryCol].toString().trim() === subcategory &&
          data[i][specificationsCol]) {
        specifications.add(data[i][specificationsCol].toString().trim());
      }
    }

    return Array.from(specifications).sort();
  } catch (error) {
    Logger.log('Error in getSpecifications: ' + error.toString());
    return [];
  }
}

/**
 * Gets spec configuration for a category/subcategory/type (UPDATED FOR NEW STRUCTURE)
 * Returns the labels for each spec field
 * @param {string} category - The category name
 * @param {string} subcategory - The subcategory name
 * @param {string} type - The type name (NEW)
 * @returns {Object} Spec configuration object with labels
 */
function getSpecConfig(category, subcategory, type) {
  try {
    if (!category || !subcategory || !type) {
      return null;
    }

    // Check cache first
    const cache = CacheService.getScriptCache();
    const cacheKey = 'specConfig_' + category + '_' + subcategory + '_' + type;
    const cached = cache.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        Logger.log('Cache parse error in getSpecConfig: ' + error.message);
      }
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.SPEC_CONFIG_SHEET_NAME);

    if (!sheet) {
      throw new Error('Spec Config sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // NEW: Get column indices for new 9-column structure
    // Columns: Category Code, Category Name, Subcategory Name, Type,
    //          Spec 1 Label, Spec 2 Label, Spec 3 Label, Spec 4 Label, Spec 5 Label
    const categoryNameCol = headers.indexOf('Category Name');
    const subcategoryCol = headers.indexOf('Subcategory Name');
    const typeCol = headers.indexOf('Type');
    const spec1LabelCol = headers.indexOf('Spec 1 Label');
    const spec2LabelCol = headers.indexOf('Spec 2 Label');
    const spec3LabelCol = headers.indexOf('Spec 3 Label');
    const spec4LabelCol = headers.indexOf('Spec 4 Label');
    const spec5LabelCol = headers.indexOf('Spec 5 Label');

    if (categoryNameCol === -1 || subcategoryCol === -1 || typeCol === -1) {
      throw new Error('Required Spec Config columns not found');
    }

    // Find matching row
    for (let i = 1; i < data.length; i++) {
      if (data[i][categoryNameCol] &&
          data[i][categoryNameCol].toString().trim() === category &&
          data[i][subcategoryCol] &&
          data[i][subcategoryCol].toString().trim() === subcategory &&
          data[i][typeCol] &&
          data[i][typeCol].toString().trim() === type) {

        const config = {
          spec1Label: data[i][spec1LabelCol] ? data[i][spec1LabelCol].toString().trim() : '',
          spec2Label: data[i][spec2LabelCol] ? data[i][spec2LabelCol].toString().trim() : '',
          spec3Label: data[i][spec3LabelCol] ? data[i][spec3LabelCol].toString().trim() : '',
          spec4Label: data[i][spec4LabelCol] ? data[i][spec4LabelCol].toString().trim() : '',
          spec5Label: data[i][spec5LabelCol] ? data[i][spec5LabelCol].toString().trim() : ''  // NEW
        };

        // Cache for 5 minutes
        try {
          cache.put(cacheKey, JSON.stringify(config), 300);
        } catch (error) {
          Logger.log('Cache storage error: ' + error.message);
        }

        return config;
      }
    }

    // No config found for this category/subcategory/type combination
    return null;
  } catch (error) {
    Logger.log('Error in getSpecConfig: ' + error.toString());
    throw new Error('Failed to retrieve spec configuration: ' + error.message);
  }
}

/**
 * Gets unique values for a specific spec field (UPDATED TO SUPPORT SPEC 5 AND TYPE)
 * @param {string} category - The category name
 * @param {string} subcategory - The subcategory name
 * @param {string} type - The type name (NEW - optional)
 * @param {number} specNumber - Which spec (1, 2, 3, 4, or 5)
 * @returns {Array<string>} Sorted unique values for the spec field
 */
function getSpecValues(category, subcategory, type, specNumber) {
  try {
    if (!category || !subcategory || !specNumber || specNumber < 1 || specNumber > 5) {
      return [];
    }

    // Check cache first
    const cache = CacheService.getScriptCache();
    const cacheKey = 'specValues_' + category + '_' + subcategory + '_' + (type || 'ALL') + '_' + specNumber;
    const cached = cache.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        Logger.log('Cache parse error in getSpecValues: ' + error.message);
      }
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_DIRECTORY_ID);
    const sheet = ss.getSheetByName(CONFIG.PARTS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Parts sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices
    const categoryCol = headers.indexOf('Category');
    const subcategoryCol = headers.indexOf('Subcategory');
    const typeCol = headers.indexOf('Type');
    const specCol = headers.indexOf('Spec ' + specNumber);

    if (categoryCol === -1 || subcategoryCol === -1 || specCol === -1) {
      return [];
    }

    const values = new Set();

    // Collect unique non-empty values for this spec
    for (let i = 1; i < data.length; i++) {
      const matchesCategory = data[i][categoryCol] && data[i][categoryCol].toString().trim() === category;
      const matchesSubcategory = data[i][subcategoryCol] && data[i][subcategoryCol].toString().trim() === subcategory;

      // If type is specified, filter by it; otherwise get all types
      let matchesType = true;
      if (type && type.trim()) {
        matchesType = data[i][typeCol] && data[i][typeCol].toString().trim() === type;
      }

      if (matchesCategory && matchesSubcategory && matchesType &&
          data[i][specCol] && data[i][specCol].toString().trim() !== '') {
        values.add(data[i][specCol].toString().trim());
      }
    }

    const result = Array.from(values).sort();

    // Cache for 5 minutes
    try {
      cache.put(cacheKey, JSON.stringify(result), 300);
    } catch (error) {
      Logger.log('Cache storage error: ' + error.message);
    }

    return result;
  } catch (error) {
    Logger.log('Error in getSpecValues: ' + error.toString());
    return [];
  }
}

/**
 * Manual sync function for testing (callable from webapp)
 * @returns {Object} Sync results with counts
 */
function syncToMondayManual() {
  try {
    const newOrdersResult = processNewOrders();
    const statusResult = syncMondayToSheets();

    return {
      success: true,
      created: newOrdersResult.created,
      updated: statusResult.updated,
      errors: newOrdersResult.failed
    };
  } catch (error) {
    Logger.log('Manual sync error: ' + error.toString());
    return {
      success: false,
      message: error.message,
      created: 0,
      updated: 0,
      errors: 1
    };
  }
}

/**
 * Syncs to Monday.com with admin password verification
 * @param {string} password - Admin password
 * @returns {Object} Sync result
 */
function syncToMondayWithPassword(password) {
  try {
    if (!verifyMondayAdminPassword(password)) {
      return {
        success: false,
        message: 'Incorrect admin password'
      };
    }

    return syncToMondayManual();
  } catch (error) {
    Logger.log('Password-protected sync error: ' + error.toString());
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Scheduled sync function for time-based trigger
 */
function syncToMondayScheduled() {
  const result = syncToMondayManual();
  Logger.log('Scheduled sync complete: ' + JSON.stringify(result));
}

/**
 * One-time setup function to store Monday.com credentials
 * Run this once from Apps Script editor, then delete
 */
function setupMondayApiToken() {
  const token = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjI4OTcxMzMyNywiYWFpIjoxMSwidWlkIjozMzE3MjU1NiwiaWFkIjoiMjAyMy0xMC0xOFQxNzo0MTo0NC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTMwNzc3MDYsInJnbiI6InVzZTEifQ.p3zitBOQhW8TDcwiT7uZLlbcAnd7nfVCmfspwEpf5Ic';
  const boardId = '3241360873';

  PropertiesService.getScriptProperties().setProperty('MONDAY_API_TOKEN', token);
  PropertiesService.getScriptProperties().setProperty('MONDAY_BOARD_ID', boardId);

  Logger.log('Monday.com credentials stored successfully');
  Logger.log('IMPORTANT: Delete the setupMondayApiToken function after running once');
}

/**
 * One-time function to activate automatic Monday.com syncing
 * Run this ONCE from Apps Script editor after deployment
 * Creates time-based triggers for automatic sync every 5 minutes
 */
function activateMondayAutoSync() {
  try {
    const result = setupMondayTriggers();
    Logger.log('Auto-sync activation: ' + JSON.stringify(result));
    return result;
  } catch (error) {
    Logger.log('Failed to activate auto-sync: ' + error.toString());
    return { success: false, message: error.message };
  }
}
