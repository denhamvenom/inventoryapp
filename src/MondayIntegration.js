/**
 * Monday.com Integration Module
 * Denham Venom Parts Management System - Team 8044
 *
 * Handles bidirectional synchronization between Google Sheets and Monday.com
 * Board ID: 3241360873
 * Board Name: "Supply Ordering System"
 */

/**
 * Monday.com API Configuration
 */
const MONDAY_CONFIG = {
  BOARD_ID: '3241360873',
  API_VERSION: '2024-10',
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  BATCH_SIZE: 10
};

/**
 * Status mapping: Monday.com -> Google Sheets
 */
const STATUS_MAPPING = {
  'Need to Order': 'Requested',
  'Ordered and Waiting': 'Ordered',
  'Product Arrived': 'Received',
  'Cannot Currently Order': 'Cancelled'
};

/**
 * Monday.com Column IDs (hardcoded for performance)
 * Main Item Columns
 */
const MONDAY_MAIN_COLUMNS = {
  status: 'status',
  priority: 'text_mkx8wrtc',
  orderType: 'text_mkx8vbtc',
  department: 'text_mkx8mnp',
  studentName: 'text_mkx812a8',
  dateSubmitted: 'date_mkx83bc6'
};

/**
 * Monday.com Subitem Column IDs
 */
const MONDAY_SUBITEM_COLUMNS = {
  partName: 'text_mkx8naek',
  quantity: 'numeric_mkx8t4fc',
  totalCost: 'numeric_mkx86w0v',
  productCode: 'text_mkx8jape',
  supplier: 'text_mkx8czzy',
  supplierLink: 'link_mkx89c62',
  justification: 'text_mkx8exde',
  notes: 'long_text_mkx8kp09',
  csvFileLink: 'link_mkx86fgc'
};

/**
 * Gets the Monday.com API token from Script Properties
 * @returns {string} API token
 * @throws {Error} If token is not configured
 */
function getMondayApiToken() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const token = scriptProperties.getProperty('MONDAY_API_TOKEN');

  if (!token) {
    throw new Error('Monday.com API token not configured. Set MONDAY_API_TOKEN in Script Properties.');
  }

  return token;
}

/**
 * Makes a GraphQL API call to Monday.com with retry logic
 * @param {string} query - GraphQL query string
 * @param {Object} variables - Query variables
 * @returns {Object} API response data
 * @throws {Error} If all retry attempts fail
 */
function mondayApiCall(query, variables) {
  const token = getMondayApiToken();
  const url = 'https://api.monday.com/v2';

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': token,
      'API-Version': MONDAY_CONFIG.API_VERSION
    },
    payload: JSON.stringify({
      query: query,
      variables: variables
    }),
    muteHttpExceptions: true
  };

  let lastError = null;

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= MONDAY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      if (responseCode === 200) {
        const data = JSON.parse(responseText);

        // Check for GraphQL errors
        if (data.errors && data.errors.length > 0) {
          throw new Error('GraphQL Error: ' + JSON.stringify(data.errors));
        }

        return data.data;
      } else if (responseCode === 429) {
        // Rate limit - wait longer
        const delay = MONDAY_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
        Logger.log('Rate limited. Waiting ' + delay + 'ms before retry ' + attempt);
        Utilities.sleep(delay);
        lastError = new Error('Rate limited');
        continue;
      } else {
        throw new Error('HTTP ' + responseCode + ': ' + responseText);
      }
    } catch (error) {
      lastError = error;
      Logger.log('API call attempt ' + attempt + ' failed: ' + error.toString());

      if (attempt < MONDAY_CONFIG.MAX_RETRIES) {
        const delay = MONDAY_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        Logger.log('Retrying in ' + delay + 'ms...');
        Utilities.sleep(delay);
      }
    }
  }

  // All retries failed
  throw new Error('Monday API call failed after ' + MONDAY_CONFIG.MAX_RETRIES + ' attempts: ' + lastError.toString());
}

/**
 * Gets orders from the Orders sheet that need to be synced to Monday
 * Returns rows where Monday ID column is empty
 * @returns {Array<Object>} Array of order objects
 */
function getOrdersNeedingSync() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Orders sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Get column indices
    const colIndices = {
      orderNumber: headers.indexOf('Order #'),
      date: headers.indexOf('Date'),
      department: headers.indexOf('Department'),
      studentName: headers.indexOf('Name'),
      partID: headers.indexOf('Part ID'),
      partName: headers.indexOf('Part Name'),
      category: headers.indexOf('Category'),
      quantity: headers.indexOf('Quantity Requested'),
      priority: headers.indexOf('Priority'),
      unitCost: headers.indexOf('Unit Cost'),
      totalCost: headers.indexOf('Total Cost'),
      supplier: headers.indexOf('Supplier'),
      supplierLink: headers.indexOf('Supplier Link'),
      productCode: headers.indexOf('Product Code'),
      status: headers.indexOf('Status'),
      notes: headers.indexOf('Notes'),
      justification: headers.indexOf('Justification'),
      csvFileLink: headers.indexOf('CSV File Link'),
      mondayID: headers.indexOf('Monday ID')
    };

    // Validate required columns
    if (colIndices.orderNumber === -1 || colIndices.mondayID === -1) {
      throw new Error('Required columns not found in Orders sheet');
    }

    const orders = [];

    // Collect all rows that need syncing (Monday ID is empty)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const mondayID = row[colIndices.mondayID];

      // Skip if Monday ID already exists (already synced)
      if (mondayID && mondayID.toString().trim() !== '') {
        continue;
      }

      // Skip if no order number
      if (!row[colIndices.orderNumber]) {
        continue;
      }

      orders.push({
        rowIndex: i + 1, // 1-based row index for sheet updates
        orderNumber: row[colIndices.orderNumber] ? row[colIndices.orderNumber].toString() : '',
        date: row[colIndices.date] || new Date(),
        department: row[colIndices.department] ? row[colIndices.department].toString() : '',
        studentName: row[colIndices.studentName] ? row[colIndices.studentName].toString() : '',
        partID: row[colIndices.partID] ? row[colIndices.partID].toString() : '',
        partName: row[colIndices.partName] ? row[colIndices.partName].toString() : '',
        category: row[colIndices.category] ? row[colIndices.category].toString() : '',
        quantity: parseInt(row[colIndices.quantity]) || 0,
        priority: row[colIndices.priority] ? row[colIndices.priority].toString() : 'Medium',
        unitCost: parseFloat(row[colIndices.unitCost]) || 0,
        totalCost: parseFloat(row[colIndices.totalCost]) || 0,
        supplier: row[colIndices.supplier] ? row[colIndices.supplier].toString() : '',
        supplierLink: row[colIndices.supplierLink] ? row[colIndices.supplierLink].toString() : '',
        productCode: row[colIndices.productCode] ? row[colIndices.productCode].toString() : '',
        status: row[colIndices.status] ? row[colIndices.status].toString() : 'Pending',
        notes: row[colIndices.notes] ? row[colIndices.notes].toString() : '',
        justification: row[colIndices.justification] ? row[colIndices.justification].toString() : '',
        csvFileLink: row[colIndices.csvFileLink] ? row[colIndices.csvFileLink].toString() : ''
      });
    }

    Logger.log('Found ' + orders.length + ' orders needing sync to Monday');
    return orders;
  } catch (error) {
    Logger.log('Error in getOrdersNeedingSync: ' + error.toString());
    throw new Error('Failed to get orders needing sync: ' + error.message);
  }
}

/**
 * Groups individual order rows by Order Number
 * @param {Array<Object>} orders - Array of order row objects
 * @returns {Object} Map of order numbers to order data with parts array
 */
function groupOrdersByOrderNumber(orders) {
  try {
    const grouped = {};

    for (const order of orders) {
      const orderNum = order.orderNumber;

      if (!grouped[orderNum]) {
        // Initialize order group with metadata
        grouped[orderNum] = {
          orderNumber: orderNum,
          date: order.date,
          department: order.department,
          studentName: order.studentName,
          priority: order.priority,
          parts: []
        };
      }

      // Add part to this order's parts array
      grouped[orderNum].parts.push({
        rowIndex: order.rowIndex,
        partID: order.partID,
        partName: order.partName,
        category: order.category,
        quantity: order.quantity,
        unitCost: order.unitCost,
        totalCost: order.totalCost,
        supplier: order.supplier,
        supplierLink: order.supplierLink,
        productCode: order.productCode,
        notes: order.notes,
        justification: order.justification,
        csvFileLink: order.csvFileLink
      });
    }

    Logger.log('Grouped ' + orders.length + ' rows into ' + Object.keys(grouped).length + ' orders');
    return grouped;
  } catch (error) {
    Logger.log('Error in groupOrdersByOrderNumber: ' + error.toString());
    throw new Error('Failed to group orders: ' + error.message);
  }
}

/**
 * Detects the order type based on the parts in the order
 * @param {Array<Object>} parts - Array of part objects
 * @returns {string} Order type: "Directory Order", "Custom Request", or "CSV Order"
 */
function detectOrderType(parts) {
  try {
    if (!parts || parts.length === 0) {
      return 'Directory Order';
    }

    // Check first part to determine type
    const firstPart = parts[0];

    // CSV Order: Part ID is "CSV-ORDER"
    if (firstPart.partID === 'CSV-ORDER') {
      return 'CSV Order';
    }

    // Custom Request: Part ID starts with "CUSTOM-" and Product Code is "N/A"
    if (firstPart.partID.startsWith('CUSTOM-') && firstPart.productCode === 'N/A') {
      return 'Custom Request';
    }

    // Directory Order: Part ID matches standard patterns (FAST-*, ELEC-*, etc.)
    const directoryPattern = /^[A-Z]{4}-\d{3}$/;
    if (directoryPattern.test(firstPart.partID)) {
      return 'Directory Order';
    }

    // Default to Directory Order
    return 'Directory Order';
  } catch (error) {
    Logger.log('Error in detectOrderType: ' + error.toString());
    return 'Directory Order';
  }
}

/**
 * Creates a main item in Monday.com for an order
 * @param {string} orderNumber - The order number
 * @param {Object} orderData - Order metadata (date, department, student, priority)
 * @returns {string} Monday item ID
 * @throws {Error} If creation fails
 */
function createMainItem(orderNumber, orderData) {
  try {
    // Detect order type from parts
    const orderType = detectOrderType(orderData.parts);

    // Format date for Monday (YYYY-MM-DD)
    const dateObj = orderData.date instanceof Date ? orderData.date : new Date(orderData.date);
    const formattedDate = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Build column values JSON
    const columnValues = {};
    columnValues[MONDAY_MAIN_COLUMNS.status] = { label: 'Need to Order' };
    columnValues[MONDAY_MAIN_COLUMNS.priority] = orderData.priority || 'Medium';
    columnValues[MONDAY_MAIN_COLUMNS.orderType] = orderType;
    columnValues[MONDAY_MAIN_COLUMNS.department] = orderData.department || '';
    columnValues[MONDAY_MAIN_COLUMNS.studentName] = orderData.studentName || '';
    columnValues[MONDAY_MAIN_COLUMNS.dateSubmitted] = { date: formattedDate };

    const query = `
      mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item (
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
          name
        }
      }
    `;

    const variables = {
      boardId: MONDAY_CONFIG.BOARD_ID,
      itemName: orderNumber,
      columnValues: JSON.stringify(columnValues)
    };

    Logger.log('Creating main item for order: ' + orderNumber);
    const response = mondayApiCall(query, variables);

    if (!response.create_item || !response.create_item.id) {
      throw new Error('Failed to create main item - no ID returned');
    }

    const itemId = response.create_item.id;
    Logger.log('Created main item with ID: ' + itemId);

    return itemId;
  } catch (error) {
    Logger.log('Error in createMainItem: ' + error.toString());
    throw new Error('Failed to create main item: ' + error.message);
  }
}

/**
 * Creates subitems in Monday.com for the parts in an order
 * @param {string} mainItemId - The parent item ID
 * @param {Array<Object>} parts - Array of part objects
 * @param {string} orderType - The detected order type
 * @returns {Array<Object>} Array of objects with rowIndex and mondayId
 * @throws {Error} If subitem creation fails
 */
function createSubitems(mainItemId, parts, orderType) {
  try {
    const subitemUpdates = [];

    for (const part of parts) {
      // Build column values based on order type
      const columnValues = {};

      // Common fields for all order types
      columnValues[MONDAY_SUBITEM_COLUMNS.partName] = part.partName || '';
      columnValues[MONDAY_SUBITEM_COLUMNS.quantity] = part.quantity || 0;
      columnValues[MONDAY_SUBITEM_COLUMNS.totalCost] = part.totalCost || 0;
      columnValues[MONDAY_SUBITEM_COLUMNS.notes] = part.notes || '';

      if (orderType === 'CSV Order') {
        // CSV Order specific fields
        columnValues[MONDAY_SUBITEM_COLUMNS.productCode] = 'CSV-ORDER';
        columnValues[MONDAY_SUBITEM_COLUMNS.supplier] = 'WCP';
        columnValues[MONDAY_SUBITEM_COLUMNS.supplierLink] = { url: part.supplierLink || '', text: 'WCP Quick Order' };
        columnValues[MONDAY_SUBITEM_COLUMNS.csvFileLink] = { url: part.csvFileLink || '', text: 'View CSV File' };
        columnValues[MONDAY_SUBITEM_COLUMNS.justification] = 'CSV order - no justification';
      } else if (orderType === 'Custom Request') {
        // Custom Request specific fields
        columnValues[MONDAY_SUBITEM_COLUMNS.productCode] = 'N/A';
        columnValues[MONDAY_SUBITEM_COLUMNS.supplier] = part.supplier || '';
        columnValues[MONDAY_SUBITEM_COLUMNS.supplierLink] = { url: part.supplierLink || '', text: 'Part Link' };
        columnValues[MONDAY_SUBITEM_COLUMNS.justification] = part.justification || '';
      } else {
        // Directory Order specific fields
        columnValues[MONDAY_SUBITEM_COLUMNS.productCode] = part.productCode || '';
        columnValues[MONDAY_SUBITEM_COLUMNS.supplier] = part.supplier || '';
        columnValues[MONDAY_SUBITEM_COLUMNS.supplierLink] = { url: part.supplierLink || '', text: 'Order Link' };
        columnValues[MONDAY_SUBITEM_COLUMNS.justification] = part.justification || '';
      }

      // Create subitem with Part ID as the name
      const query = `
        mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
          create_subitem (
            parent_item_id: $parentItemId,
            item_name: $itemName,
            column_values: $columnValues
          ) {
            id
            name
          }
        }
      `;

      const variables = {
        parentItemId: mainItemId,
        itemName: part.partID || 'Unknown',
        columnValues: JSON.stringify(columnValues)
      };

      Logger.log('Creating subitem for part: ' + part.partID);
      const response = mondayApiCall(query, variables);

      if (!response.create_subitem || !response.create_subitem.id) {
        throw new Error('Failed to create subitem for part: ' + part.partID);
      }

      const subitemId = response.create_subitem.id;
      Logger.log('Created subitem with ID: ' + subitemId);

      // Store mapping for sheet update
      subitemUpdates.push({
        rowIndex: part.rowIndex,
        mondayId: subitemId
      });

      // Small delay to avoid rate limiting
      Utilities.sleep(200);
    }

    return subitemUpdates;
  } catch (error) {
    Logger.log('Error in createSubitems: ' + error.toString());
    throw new Error('Failed to create subitems: ' + error.message);
  }
}

/**
 * Saves Monday item IDs back to the Orders sheet
 * @param {Array<Object>} updates - Array of objects with rowIndex and mondayId
 */
function saveMondayIdsToSheet(updates) {
  try {
    if (!updates || updates.length === 0) {
      Logger.log('No Monday IDs to save');
      return;
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Orders sheet not found');
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const mondayIDCol = headers.indexOf('Monday ID') + 1; // Convert to 1-based

    if (mondayIDCol === 0) {
      throw new Error('Monday ID column not found');
    }

    // Update each row with its Monday ID
    for (const update of updates) {
      sheet.getRange(update.rowIndex, mondayIDCol).setValue(update.mondayId);
    }

    Logger.log('Saved ' + updates.length + ' Monday IDs to sheet');
  } catch (error) {
    Logger.log('Error in saveMondayIdsToSheet: ' + error.toString());
    throw new Error('Failed to save Monday IDs: ' + error.message);
  }
}

/**
 * Gets status updates from Monday.com for existing orders
 * @returns {Array<Object>} Array of objects with mondayId and status
 */
function syncStatusFromMonday() {
  try {
    // Get all Monday IDs from the Orders sheet
    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Orders sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const mondayIDCol = headers.indexOf('Monday ID');

    if (mondayIDCol === -1) {
      throw new Error('Monday ID column not found');
    }

    // Collect unique Monday IDs (exclude empty)
    const mondayIds = new Set();
    for (let i = 1; i < data.length; i++) {
      const mondayId = data[i][mondayIDCol];
      if (mondayId && mondayId.toString().trim() !== '') {
        mondayIds.add(mondayId.toString().trim());
      }
    }

    if (mondayIds.size === 0) {
      Logger.log('No Monday IDs found to sync status');
      return [];
    }

    Logger.log('Syncing status for ' + mondayIds.size + ' Monday items');

    // Query Monday for status of these items
    const statusUpdates = [];
    const idArray = Array.from(mondayIds);

    // Process in batches to avoid query size limits
    for (let i = 0; i < idArray.length; i += MONDAY_CONFIG.BATCH_SIZE) {
      const batch = idArray.slice(i, i + MONDAY_CONFIG.BATCH_SIZE);

      const query = `
        query ($itemIds: [ID!]!) {
          items (ids: $itemIds) {
            id
            column_values {
              id
              text
            }
          }
        }
      `;

      const variables = {
        itemIds: batch
      };

      const response = mondayApiCall(query, variables);

      if (response.items) {
        for (const item of response.items) {
          // Find the status column
          const statusColumn = item.column_values.find(col => col.id === 'status');
          if (statusColumn) {
            const mondayStatus = statusColumn.text || 'Need to Order';
            const sheetStatus = STATUS_MAPPING[mondayStatus] || mondayStatus;
            statusUpdates.push({
              mondayId: item.id,
              status: sheetStatus
            });
          }
        }
      }

      // Small delay between batches
      if (i + MONDAY_CONFIG.BATCH_SIZE < idArray.length) {
        Utilities.sleep(500);
      }
    }

    Logger.log('Retrieved status for ' + statusUpdates.length + ' items');
    return statusUpdates;
  } catch (error) {
    Logger.log('Error in syncStatusFromMonday: ' + error.toString());
    throw new Error('Failed to sync status from Monday: ' + error.message);
  }
}

/**
 * Updates status values in the Orders sheet from Monday.com
 * @param {Array<Object>} statusUpdates - Array of objects with mondayId and status
 * @returns {number} Number of rows updated
 */
function updateSheetStatuses(statusUpdates) {
  try {
    if (!statusUpdates || statusUpdates.length === 0) {
      Logger.log('No status updates to apply');
      return 0;
    }

    const ss = SpreadsheetApp.openById(CONFIG.PARTS_ORDERS_ID);
    const sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET_NAME);

    if (!sheet) {
      throw new Error('Orders sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const mondayIDCol = headers.indexOf('Monday ID');
    const statusCol = headers.indexOf('Status');

    if (mondayIDCol === -1 || statusCol === -1) {
      throw new Error('Required columns not found');
    }

    // Create lookup map
    const statusMap = {};
    for (const update of statusUpdates) {
      statusMap[update.mondayId] = update.status;
    }

    // Update rows
    let updatedCount = 0;
    for (let i = 1; i < data.length; i++) {
      const mondayId = data[i][mondayIDCol];
      if (mondayId && statusMap[mondayId.toString()]) {
        const newStatus = statusMap[mondayId.toString()];
        const currentStatus = data[i][statusCol];

        // Only update if status changed
        if (currentStatus !== newStatus) {
          sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
          updatedCount++;
        }
      }
    }

    Logger.log('Updated status for ' + updatedCount + ' rows');
    return updatedCount;
  } catch (error) {
    Logger.log('Error in updateSheetStatuses: ' + error.toString());
    throw new Error('Failed to update sheet statuses: ' + error.message);
  }
}

/**
 * Main function to process new orders and sync them to Monday.com
 * This is the primary Sheets to Monday sync function
 * Can be triggered manually or by time-based trigger
 */
function processNewOrders() {
  try {
    Logger.log('=== Starting Monday.com sync: Sheets to Monday ===');

    // Get orders that need syncing
    const orders = getOrdersNeedingSync();

    if (orders.length === 0) {
      Logger.log('No new orders to sync');
      return { created: 0, failed: 0 };
    }

    // Group orders by order number
    const groupedOrders = groupOrdersByOrderNumber(orders);

    let successCount = 0;
    let errorCount = 0;

    // Process each order group
    for (const orderNum in groupedOrders) {
      try {
        const orderData = groupedOrders[orderNum];
        Logger.log('Processing order: ' + orderNum);

        // Create main item
        const mainItemId = createMainItem(orderNum, orderData);

        // Detect order type
        const orderType = detectOrderType(orderData.parts);

        // Create subitems for all parts
        const subitemUpdates = createSubitems(mainItemId, orderData.parts, orderType);

        // Save Monday IDs back to sheet
        saveMondayIdsToSheet(subitemUpdates);

        successCount++;
        Logger.log('Successfully synced order: ' + orderNum);

        // Delay between orders to avoid rate limiting
        Utilities.sleep(1000);
      } catch (error) {
        errorCount++;
        Logger.log('Failed to sync order ' + orderNum + ': ' + error.toString());
        // Continue with next order
      }
    }

    Logger.log('=== Sync complete ===');
    Logger.log('Success: ' + successCount + ' orders');
    Logger.log('Errors: ' + errorCount + ' orders');

    return { created: successCount, failed: errorCount };

  } catch (error) {
    Logger.log('Error in processNewOrders: ' + error.toString());
    throw new Error('Failed to process new orders: ' + error.message);
  }
}

/**
 * Main function to sync status updates from Monday.com back to Sheets
 * This is the primary Monday to Sheets sync function
 * Can be triggered manually or by time-based trigger
 * @returns {Object} Object with updated count
 */
function syncMondayToSheets() {
  try {
    Logger.log('=== Starting Monday.com sync: Monday to Sheets ===');

    // Get status updates from Monday
    const statusUpdates = syncStatusFromMonday();

    if (statusUpdates.length === 0) {
      Logger.log('No status updates from Monday');
      return { updated: 0 };
    }

    // Update sheet with new statuses
    const updatedCount = updateSheetStatuses(statusUpdates);

    Logger.log('=== Sync complete ===');

    return { updated: updatedCount };

  } catch (error) {
    Logger.log('Error in syncMondayToSheets: ' + error.toString());
    throw new Error('Failed to sync Monday to Sheets: ' + error.message);
  }
}

/**
 * Sets up time-based triggers for automatic synchronization
 * Call this once to establish automatic syncing
 */
function setupMondayTriggers() {
  try {
    // Clear existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'processNewOrders' ||
          trigger.getHandlerFunction() === 'syncMondayToSheets') {
        ScriptApp.deleteTrigger(trigger);
      }
    }

    // Create trigger to sync new orders every 5 minutes
    ScriptApp.newTrigger('processNewOrders')
      .timeBased()
      .everyMinutes(5)
      .create();

    // Create trigger to sync status updates every 30 minutes
    ScriptApp.newTrigger('syncMondayToSheets')
      .timeBased()
      .everyMinutes(30)
      .create();

    Logger.log('Monday.com sync triggers created successfully');
    return { success: true, message: 'Triggers created successfully' };
  } catch (error) {
    Logger.log('Error in setupMondayTriggers: ' + error.toString());
    return { success: false, message: 'Failed to setup triggers: ' + error.message };
  }
}

/**
 * Removes all Monday.com sync triggers
 * Use this to disable automatic syncing
 */
function removeMondayTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removedCount = 0;

    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'processNewOrders' ||
          trigger.getHandlerFunction() === 'syncMondayToSheets') {
        ScriptApp.deleteTrigger(trigger);
        removedCount++;
      }
    }

    Logger.log('Removed ' + removedCount + ' Monday.com sync triggers');
    return { success: true, message: 'Removed ' + removedCount + ' triggers' };
  } catch (error) {
    Logger.log('Error in removeMondayTriggers: ' + error.toString());
    return { success: false, message: 'Failed to remove triggers: ' + error.message };
  }
}
