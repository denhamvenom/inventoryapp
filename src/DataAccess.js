/**
 * DataAccess.js
 * Data access layer for Denham Venom Parts System
 * Team 8044 Denham Venom
 *
 * Handles all interactions with Google Sheets including read/write operations,
 * caching, formula management, and data validation.
 */

// Spreadsheet IDs - Update these after creating your sheets
const PARTS_DIRECTORY_SPREADSHEET_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';
const PARTS_ORDERS_SPREADSHEET_ID = '1f-4T0wMjLQKnA-dbFMgUDRKnSuwi0kjdSl91MuRHpeQ';

// Sheet names
const INVENTORY_SHEET_NAME = 'Parts';
const ORDERS_SHEET_NAME = 'Orders';
const ROSTER_SHEET_NAME = 'Students';

// Cache configuration
const CACHE_EXPIRATION_SECONDS = 300; // 5 minutes
const CACHE_PREFIX = 'DV_PARTS_';

/**
 * Gets the Parts Directory spreadsheet
 * @returns {Spreadsheet} The Parts Directory spreadsheet object
 * @throws {Error} If spreadsheet cannot be accessed
 */
function getPartsDirectorySpreadsheet() {
  try {
    return SpreadsheetApp.openById(PARTS_DIRECTORY_SPREADSHEET_ID);
  } catch (error) {
    throw new Error(`Unable to access Parts Directory spreadsheet: ${error.message}`);
  }
}

/**
 * Gets the Parts Orders spreadsheet
 * @returns {Spreadsheet} The Parts Orders spreadsheet object
 * @throws {Error} If spreadsheet cannot be accessed
 */
function getPartsOrdersSpreadsheet() {
  try {
    return SpreadsheetApp.openById(PARTS_ORDERS_SPREADSHEET_ID);
  } catch (error) {
    throw new Error(`Unable to access Parts Orders spreadsheet: ${error.message}`);
  }
}

/**
 * Retrieves all inventory data with caching for performance
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Array<Object>} Array of inventory objects
 * @throws {Error} If data cannot be retrieved
 */
function getInventoryData(useCache = true) {
  const cacheKey = CACHE_PREFIX + 'INVENTORY';
  const cache = CacheService.getScriptCache();

  // Try to get from cache first
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        Logger.log('Cache parse error: ' + error.message);
      }
    }
  }

  try {
    const spreadsheet = getPartsDirectorySpreadsheet();
    const sheet = spreadsheet.getSheetByName(INVENTORY_SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${INVENTORY_SHEET_NAME}" not found in Parts Directory`);
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return []; // No data rows, only header
    }

    // Parse data into objects
    const headers = data[0];
    const inventory = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const item = {};

      headers.forEach((header, index) => {
        item[header] = row[index];
      });

      inventory.push(item);
    }

    // Store in cache
    try {
      cache.put(cacheKey, JSON.stringify(inventory), CACHE_EXPIRATION_SECONDS);
    } catch (error) {
      Logger.log('Cache storage error: ' + error.message);
    }

    return inventory;
  } catch (error) {
    throw new Error(`Failed to retrieve inventory data: ${error.message}`);
  }
}

/**
 * Retrieves all order data with caching
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Array<Object>} Array of order objects
 * @throws {Error} If data cannot be retrieved
 */
function getOrdersData(useCache = true) {
  const cacheKey = CACHE_PREFIX + 'ORDERS';
  const cache = CacheService.getScriptCache();

  // Try to get from cache first
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        Logger.log('Cache parse error: ' + error.message);
      }
    }
  }

  try {
    const spreadsheet = getPartsOrdersSpreadsheet();
    const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${ORDERS_SHEET_NAME}" not found in Parts Orders`);
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return []; // No data rows, only header
    }

    // Parse data into objects
    const headers = data[0];
    const orders = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const order = {};

      headers.forEach((header, index) => {
        order[header] = row[index];
      });

      orders.push(order);
    }

    // Store in cache
    try {
      cache.put(cacheKey, JSON.stringify(orders), CACHE_EXPIRATION_SECONDS);
    } catch (error) {
      Logger.log('Cache storage error: ' + error.message);
    }

    return orders;
  } catch (error) {
    throw new Error(`Failed to retrieve orders data: ${error.message}`);
  }
}

/**
 * Retrieves roster data with caching
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Array<Object>} Array of student objects
 * @throws {Error} If data cannot be retrieved
 */
function getRosterData(useCache = true) {
  const cacheKey = CACHE_PREFIX + 'ROSTER';
  const cache = CacheService.getScriptCache();

  // Try to get from cache first
  if (useCache) {
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        Logger.log('Cache parse error: ' + error.message);
      }
    }
  }

  try {
    const spreadsheet = getPartsOrdersSpreadsheet();
    const sheet = spreadsheet.getSheetByName(ROSTER_SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${ROSTER_SHEET_NAME}" not found in Parts Orders`);
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return []; // No data rows, only header
    }

    // Parse data into objects
    const headers = data[0];
    const roster = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const student = {};

      headers.forEach((header, index) => {
        student[header] = row[index];
      });

      roster.push(student);
    }

    // Store in cache
    try {
      cache.put(cacheKey, JSON.stringify(roster), CACHE_EXPIRATION_SECONDS);
    } catch (error) {
      Logger.log('Cache storage error: ' + error.message);
    }

    return roster;
  } catch (error) {
    throw new Error(`Failed to retrieve roster data: ${error.message}`);
  }
}

/**
 * Adds a new order to the Orders sheet with VLOOKUP formulas
 * @param {Object} orderData - The order data to add
 * @returns {Object} Result object with success flag and order number
 * @throws {Error} If order cannot be added
 */
function addOrder(orderData) {
  try {
    const spreadsheet = getPartsOrdersSpreadsheet();
    const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${ORDERS_SHEET_NAME}" not found`);
    }

    // Generate order number
    const orderNumber = generateOrderNumber(sheet);

    // Get the last row
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;

    // Prepare row data with VLOOKUP formulas
    const rowData = [
      orderNumber,
      orderData.orderDate,
      orderData.studentName,
      orderData.partCategory,
      orderData.partID,
      // Part Name - VLOOKUP from Inventory
      `=VLOOKUP(E${newRow},'${INVENTORY_SHEET_NAME}'!A:B,2,FALSE)`,
      orderData.quantity,
      // Cost Per Unit - VLOOKUP from Inventory
      `=VLOOKUP(E${newRow},'${INVENTORY_SHEET_NAME}'!A:F,6,FALSE)`,
      // Total Cost - Calculated
      `=G${newRow}*H${newRow}`,
      orderData.notes,
      orderData.status
    ];

    // Append the row
    sheet.appendRow(rowData);

    // Clear cache to force refresh
    clearCache('ORDERS');

    return {
      success: true,
      orderNumber: orderNumber,
      message: 'Order added successfully'
    };
  } catch (error) {
    throw new Error(`Failed to add order: ${error.message}`);
  }
}

/**
 * Adds a new part to the Inventory sheet
 * @param {Object} partData - The part data to add
 * @returns {Object} Result object with success flag and part ID
 * @throws {Error} If part cannot be added
 */
function addPart(partData) {
  try {
    const spreadsheet = getPartsDirectorySpreadsheet();
    const sheet = spreadsheet.getSheetByName(INVENTORY_SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${INVENTORY_SHEET_NAME}" not found`);
    }

    // Prepare row data
    const rowData = [
      partData.partID,
      partData.partName,
      partData.category,
      partData.supplier,
      partData.supplierPartNumber,
      partData.costPerUnit,
      partData.location,
      partData.quantityOnHand,
      partData.reorderPoint,
      partData.description,
      partData.dateAdded,
      partData.lastUpdated
    ];

    // Append the row
    sheet.appendRow(rowData);

    // Clear cache to force refresh
    clearCache('INVENTORY');

    return {
      success: true,
      partID: partData.partID,
      message: 'Part added successfully'
    };
  } catch (error) {
    throw new Error(`Failed to add part: ${error.message}`);
  }
}

/**
 * Updates an existing part in the Inventory sheet
 * @param {string} partID - The Part ID to update
 * @param {Object} updates - Object containing fields to update
 * @returns {Object} Result object with success flag
 * @throws {Error} If part cannot be updated
 */
function updatePart(partID, updates) {
  try {
    const spreadsheet = getPartsDirectorySpreadsheet();
    const sheet = spreadsheet.getSheetByName(INVENTORY_SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${INVENTORY_SHEET_NAME}" not found`);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find the row with the matching Part ID
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === partID) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Part ID ${partID} not found`);
    }

    // Update the specified fields
    for (const field in updates) {
      if (updates.hasOwnProperty(field)) {
        const colIndex = headers.indexOf(field);
        if (colIndex !== -1) {
          sheet.getRange(rowIndex + 1, colIndex + 1).setValue(updates[field]);
        }
      }
    }

    // Update last modified timestamp
    const lastUpdatedCol = headers.indexOf('Last Updated');
    if (lastUpdatedCol !== -1) {
      sheet.getRange(rowIndex + 1, lastUpdatedCol + 1).setValue(formatDate(new Date()));
    }

    // Clear cache
    clearCache('INVENTORY');

    return {
      success: true,
      message: 'Part updated successfully'
    };
  } catch (error) {
    throw new Error(`Failed to update part: ${error.message}`);
  }
}

/**
 * Generates a unique Part ID based on category and existing parts
 * @param {string} category - The category code (e.g., FAST, ELEC, PNEU)
 * @returns {string} Generated Part ID (e.g., FAST-001)
 * @throws {Error} If Part ID cannot be generated
 */
function generatePartID(category) {
  try {
    const inventory = getInventoryData(false); // Don't use cache for accuracy

    // Filter parts by category
    const categoryParts = inventory.filter(part =>
      part['Part ID'] && part['Part ID'].startsWith(category + '-')
    );

    // Find the highest number in this category
    let maxNumber = 0;
    const pattern = new RegExp(`^${category}-(\\d{3})$`);

    categoryParts.forEach(part => {
      const match = part['Part ID'].match(pattern);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    });

    // Generate next number
    const nextNumber = maxNumber + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');

    return `${category}-${paddedNumber}`;
  } catch (error) {
    throw new Error(`Failed to generate Part ID: ${error.message}`);
  }
}

/**
 * Generates a unique Order Number
 * @param {Sheet} sheet - The Orders sheet
 * @returns {string} Generated Order Number (e.g., ORD-00001)
 */
function generateOrderNumber(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    // First order
    return 'ORD-00001';
  }

  // Get the last order number
  const lastOrderNumber = sheet.getRange(lastRow, 1).getValue();

  if (!lastOrderNumber || typeof lastOrderNumber !== 'string') {
    return 'ORD-00001';
  }

  // Extract number and increment
  const match = lastOrderNumber.match(/^ORD-(\d{5})$/);
  if (match) {
    const number = parseInt(match[1], 10) + 1;
    return `ORD-${String(number).padStart(5, '0')}`;
  }

  return 'ORD-00001';
}

/**
 * Gets unique values from a specific column in inventory for dropdowns
 * @param {string} columnName - The column name to get values from
 * @returns {Array<string>} Array of unique values sorted alphabetically
 * @throws {Error} If values cannot be retrieved
 */
function getUniqueInventoryValues(columnName) {
  try {
    const inventory = getInventoryData();
    const values = new Set();

    inventory.forEach(item => {
      if (item[columnName] && item[columnName] !== '') {
        values.add(item[columnName]);
      }
    });

    return Array.from(values).sort();
  } catch (error) {
    throw new Error(`Failed to get unique values for ${columnName}: ${error.message}`);
  }
}

/**
 * Gets all unique suppliers from inventory
 * @returns {Array<string>} Array of supplier names
 */
function getSuppliers() {
  return getUniqueInventoryValues('Supplier');
}

/**
 * Gets all unique locations from inventory
 * @returns {Array<string>} Array of storage locations
 */
function getLocations() {
  return getUniqueInventoryValues('Location');
}

/**
 * Filters inventory by multiple criteria
 * @param {Object} filters - Object containing filter criteria
 * @param {string} filters.category - Category to filter by
 * @param {string} filters.supplier - Supplier to filter by
 * @param {string} filters.location - Location to filter by
 * @param {boolean} filters.lowStock - Only show items at or below reorder point
 * @returns {Array<Object>} Filtered inventory array
 */
function filterInventory(filters) {
  try {
    let inventory = getInventoryData();

    if (filters.category) {
      inventory = inventory.filter(item =>
        item.Category === filters.category
      );
    }

    if (filters.supplier) {
      inventory = inventory.filter(item =>
        item.Supplier === filters.supplier
      );
    }

    if (filters.location) {
      inventory = inventory.filter(item =>
        item.Location === filters.location
      );
    }

    if (filters.lowStock === true) {
      inventory = inventory.filter(item =>
        item['Quantity On Hand'] <= item['Reorder Point']
      );
    }

    return inventory;
  } catch (error) {
    throw new Error(`Failed to filter inventory: ${error.message}`);
  }
}

/**
 * Checks if a part with the given supplier part number already exists
 * @param {string} supplierPartNumber - The supplier part number to check
 * @returns {boolean} True if duplicate exists, false otherwise
 */
function checkDuplicatePart(supplierPartNumber) {
  try {
    const inventory = getInventoryData();

    return inventory.some(item =>
      item['Supplier Part Number'] &&
      item['Supplier Part Number'].toLowerCase() === supplierPartNumber.toLowerCase()
    );
  } catch (error) {
    Logger.log(`Error checking duplicate part: ${error.message}`);
    return false;
  }
}

/**
 * Gets part details by Part ID
 * @param {string} partID - The Part ID to look up
 * @returns {Object|null} Part object or null if not found
 */
function getPartByID(partID) {
  try {
    const inventory = getInventoryData();

    return inventory.find(item =>
      item['Part ID'] === partID
    ) || null;
  } catch (error) {
    throw new Error(`Failed to get part ${partID}: ${error.message}`);
  }
}

/**
 * Gets parts by category
 * @param {string} category - The category code
 * @returns {Array<Object>} Array of parts in the category
 */
function getPartsByCategory(category) {
  try {
    const inventory = getInventoryData();

    return inventory.filter(item =>
      item.Category === category
    );
  } catch (error) {
    throw new Error(`Failed to get parts for category ${category}: ${error.message}`);
  }
}

/**
 * Updates part quantity after an order
 * @param {string} partID - The Part ID to update
 * @param {number} quantityOrdered - The quantity that was ordered
 * @returns {Object} Result object with success flag
 */
function updatePartQuantity(partID, quantityOrdered) {
  try {
    const part = getPartByID(partID);

    if (!part) {
      throw new Error(`Part ${partID} not found`);
    }

    const currentQuantity = part['Quantity On Hand'];
    const newQuantity = currentQuantity - quantityOrdered;

    if (newQuantity < 0) {
      throw new Error(`Insufficient quantity. Available: ${currentQuantity}, Ordered: ${quantityOrdered}`);
    }

    return updatePart(partID, {
      'Quantity On Hand': newQuantity
    });
  } catch (error) {
    throw new Error(`Failed to update part quantity: ${error.message}`);
  }
}

/**
 * Clears cache for a specific data type or all cache
 * @param {string} dataType - The data type to clear (INVENTORY, ORDERS, ROSTER) or 'ALL'
 */
function clearCache(dataType = 'ALL') {
  const cache = CacheService.getScriptCache();

  if (dataType === 'ALL') {
    cache.removeAll([
      CACHE_PREFIX + 'INVENTORY',
      CACHE_PREFIX + 'ORDERS',
      CACHE_PREFIX + 'ROSTER'
    ]);
  } else {
    cache.remove(CACHE_PREFIX + dataType);
  }
}

/**
 * Validates data before writing to sheets
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} Validation result with success flag and errors
 */
function validateData(data, requiredFields) {
  const errors = [];

  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  });

  return {
    success: errors.length === 0,
    errors: errors
  };
}

/**
 * Formats a date object to YYYY-MM-DD string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Gets low stock items (at or below reorder point)
 * @returns {Array<Object>} Array of low stock items
 */
function getLowStockItems() {
  return filterInventory({ lowStock: true });
}

/**
 * Gets orders by status
 * @param {string} status - The order status to filter by (Pending, Completed, Cancelled)
 * @returns {Array<Object>} Array of orders with the specified status
 */
function getOrdersByStatus(status) {
  try {
    const orders = getOrdersData();

    return orders.filter(order =>
      order.Status === status
    );
  } catch (error) {
    throw new Error(`Failed to get orders by status: ${error.message}`);
  }
}

/**
 * Updates order status
 * @param {string} orderNumber - The order number to update
 * @param {string} newStatus - The new status
 * @returns {Object} Result object with success flag
 * @throws {Error} If order cannot be updated
 */
function updateOrderStatus(orderNumber, newStatus) {
  try {
    const spreadsheet = getPartsOrdersSpreadsheet();
    const sheet = spreadsheet.getSheetByName(ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error(`Sheet "${ORDERS_SHEET_NAME}" not found`);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find the row with the matching Order Number
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderNumber) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Order ${orderNumber} not found`);
    }

    // Update status
    const statusCol = headers.indexOf('Status');
    if (statusCol !== -1) {
      sheet.getRange(rowIndex + 1, statusCol + 1).setValue(newStatus);
    }

    // Clear cache
    clearCache('ORDERS');

    return {
      success: true,
      message: 'Order status updated successfully'
    };
  } catch (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}
