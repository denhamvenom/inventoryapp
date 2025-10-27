/**
 * FormHandler.js
 * Form processing and validation for Denham Venom Parts System
 * Team 8044 Denham Venom
 */

/**
 * Validates the Order Form submission
 * @param {Object} formData - The form data object containing order information
 * @param {string} formData.studentName - Name of the student placing the order
 * @param {string} formData.partCategory - Category of the part being ordered
 * @param {string} formData.partID - Unique identifier for the part
 * @param {number} formData.quantity - Quantity of parts to order
 * @param {string} formData.notes - Optional notes for the order
 * @param {Array<Object>} roster - Array of student objects from the roster
 * @param {number} partCost - Cost per unit of the part
 * @returns {Object} Validation result with success flag, errors array, and warnings array
 */
function validateOrderForm(formData, roster, partCost) {
  const errors = [];
  const warnings = [];

  // Validate student name
  if (!formData.studentName || formData.studentName.trim() === '') {
    errors.push('Student name is required.');
  } else {
    // Check if student exists in roster
    const studentExists = roster.some(student =>
      student.name && student.name.toLowerCase() === formData.studentName.toLowerCase()
    );
    if (!studentExists) {
      errors.push('Student not found in roster. Please verify the name is correct.');
    }
  }

  // Validate part category
  if (!formData.partCategory || formData.partCategory.trim() === '') {
    errors.push('Part category is required.');
  }

  // Validate part ID
  if (!formData.partID || formData.partID.trim() === '') {
    errors.push('Part ID is required.');
  } else {
    // Validate part ID format (e.g., FAST-001, ELEC-002)
    const partIDPattern = /^[A-Z]{4}-\d{3}$/;
    if (!partIDPattern.test(formData.partID)) {
      errors.push('Part ID must be in format: XXXX-000 (e.g., FAST-001).');
    }
  }

  // Validate quantity
  if (!formData.quantity) {
    errors.push('Quantity is required.');
  } else {
    const qty = parseInt(formData.quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 999) {
      errors.push('Quantity must be a number between 1 and 999.');
    }
  }

  // Calculate total cost and check for high-value orders
  if (formData.quantity && partCost) {
    const totalCost = formData.quantity * partCost;
    if (totalCost > 100) {
      warnings.push(`Order total is $${totalCost.toFixed(2)}. Orders over $100 require mentor approval.`);
    }
  }

  // Notes are optional but validate length if provided
  if (formData.notes && formData.notes.length > 500) {
    errors.push('Notes must be 500 characters or less.');
  }

  return {
    success: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

/**
 * Validates the Add Part Form submission
 * @param {Object} formData - The form data object containing new part information
 * @param {string} formData.partName - Name of the part
 * @param {string} formData.category - Category of the part
 * @param {string} formData.supplier - Supplier of the part
 * @param {string} formData.supplierPartNumber - Supplier's part number
 * @param {number} formData.costPerUnit - Cost per unit of the part
 * @param {string} formData.location - Storage location of the part
 * @param {number} formData.quantityOnHand - Current quantity in stock
 * @param {number} formData.reorderPoint - Minimum quantity before reorder
 * @param {string} formData.description - Optional description of the part
 * @param {Array<Object>} existingParts - Array of existing parts to check for duplicates
 * @returns {Object} Validation result with success flag, errors array, and warnings array
 */
function validateAddPartForm(formData, existingParts) {
  const errors = [];
  const warnings = [];

  // Validate part name
  if (!formData.partName || formData.partName.trim() === '') {
    errors.push('Part name is required.');
  } else if (formData.partName.length > 100) {
    errors.push('Part name must be 100 characters or less.');
  }

  // Validate category
  if (!formData.category || formData.category.trim() === '') {
    errors.push('Category is required.');
  } else {
    // Validate category format (4 uppercase letters)
    const categoryPattern = /^[A-Z]{4}$/;
    if (!categoryPattern.test(formData.category)) {
      errors.push('Category must be 4 uppercase letters (e.g., FAST, ELEC, PNEU).');
    }
  }

  // Validate supplier
  if (!formData.supplier || formData.supplier.trim() === '') {
    errors.push('Supplier is required.');
  }

  // Validate supplier part number
  if (!formData.supplierPartNumber || formData.supplierPartNumber.trim() === '') {
    errors.push('Supplier part number is required.');
  } else {
    // Check for duplicate supplier part number
    const duplicate = existingParts.some(part =>
      part.supplierPartNumber &&
      part.supplierPartNumber.toLowerCase() === formData.supplierPartNumber.toLowerCase()
    );
    if (duplicate) {
      warnings.push('A part with this supplier part number already exists. Please verify this is a new part.');
    }
  }

  // Validate cost per unit
  if (formData.costPerUnit === undefined || formData.costPerUnit === null || formData.costPerUnit === '') {
    errors.push('Cost per unit is required.');
  } else {
    const cost = parseFloat(formData.costPerUnit);
    if (isNaN(cost) || cost < 0) {
      errors.push('Cost per unit must be a positive number.');
    } else if (cost > 1000) {
      warnings.push(`Cost per unit is $${cost.toFixed(2)}. High-value parts require mentor approval.`);
    }
  }

  // Validate location
  if (!formData.location || formData.location.trim() === '') {
    errors.push('Storage location is required.');
  }

  // Validate quantity on hand
  if (formData.quantityOnHand === undefined || formData.quantityOnHand === null || formData.quantityOnHand === '') {
    errors.push('Quantity on hand is required.');
  } else {
    const qty = parseInt(formData.quantityOnHand, 10);
    if (isNaN(qty) || qty < 0 || qty > 9999) {
      errors.push('Quantity on hand must be a number between 0 and 9999.');
    }
  }

  // Validate reorder point
  if (formData.reorderPoint === undefined || formData.reorderPoint === null || formData.reorderPoint === '') {
    errors.push('Reorder point is required.');
  } else {
    const reorder = parseInt(formData.reorderPoint, 10);
    if (isNaN(reorder) || reorder < 0 || reorder > 999) {
      errors.push('Reorder point must be a number between 0 and 999.');
    }

    // Warn if reorder point is higher than quantity on hand
    if (formData.quantityOnHand !== undefined && reorder > parseInt(formData.quantityOnHand, 10)) {
      warnings.push('Reorder point is higher than current quantity on hand. This part may need immediate ordering.');
    }
  }

  // Description is optional but validate length if provided
  if (formData.description && formData.description.length > 500) {
    errors.push('Description must be 500 characters or less.');
  }

  return {
    success: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

/**
 * Sanitizes text input to prevent injection attacks and clean data
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>\"']/g, '');

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Sanitizes all fields in a form data object
 * @param {Object} formData - The form data object to sanitize
 * @returns {Object} Sanitized form data object
 */
function sanitizeFormData(formData) {
  const sanitized = {};

  for (const key in formData) {
    if (formData.hasOwnProperty(key)) {
      const value = formData[key];

      // Only sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Formats validation errors into a user-friendly message
 * @param {Array<string>} errors - Array of error messages
 * @returns {string} Formatted error message
 */
function formatErrorMessage(errors) {
  if (!errors || errors.length === 0) {
    return '';
  }

  let message = 'Please correct the following errors:\n\n';
  errors.forEach((error, index) => {
    message += `${index + 1}. ${error}\n`;
  });

  return message;
}

/**
 * Formats validation warnings into a user-friendly message
 * @param {Array<string>} warnings - Array of warning messages
 * @returns {string} Formatted warning message
 */
function formatWarningMessage(warnings) {
  if (!warnings || warnings.length === 0) {
    return '';
  }

  let message = 'Please note the following:\n\n';
  warnings.forEach((warning, index) => {
    message += `${index + 1}. ${warning}\n`;
  });

  return message;
}

/**
 * Generates a success message for order submission
 * @param {Object} orderData - The order data that was submitted
 * @returns {string} Success message
 */
function generateOrderSuccessMessage(orderData) {
  let message = 'Order submitted successfully.\n\n';
  message += 'Order Details:\n';
  message += `Student: ${orderData.studentName}\n`;
  message += `Part: ${orderData.partID}\n`;
  message += `Category: ${orderData.partCategory}\n`;
  message += `Quantity: ${orderData.quantity}\n`;

  if (orderData.notes) {
    message += `Notes: ${orderData.notes}\n`;
  }

  message += '\nYour order has been recorded and will be processed by the inventory team.';

  return message;
}

/**
 * Generates a success message for adding a new part
 * @param {Object} partData - The part data that was submitted
 * @param {string} generatedPartID - The generated Part ID
 * @returns {string} Success message
 */
function generateAddPartSuccessMessage(partData, generatedPartID) {
  let message = 'Part added successfully.\n\n';
  message += 'Part Details:\n';
  message += `Part ID: ${generatedPartID}\n`;
  message += `Name: ${partData.partName}\n`;
  message += `Category: ${partData.category}\n`;
  message += `Supplier: ${partData.supplier}\n`;
  message += `Cost: $${parseFloat(partData.costPerUnit).toFixed(2)}\n`;
  message += `Location: ${partData.location}\n`;
  message += `Quantity: ${partData.quantityOnHand}\n`;

  message += '\nThe new part has been added to the inventory system.';

  return message;
}

/**
 * Handles form submission errors and generates appropriate error messages
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function handleFormSubmissionError(error) {
  let message = 'An error occurred while processing your request.\n\n';

  if (error.message) {
    message += `Error: ${error.message}\n\n`;
  }

  message += 'Please try again. If the problem persists, contact the inventory team.';

  return message;
}

/**
 * Validates that a date is in the correct format and is valid
 * @param {string} dateString - Date string to validate (YYYY-MM-DD)
 * @returns {boolean} True if valid, false otherwise
 */
function validateDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
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
 * Prepares order data for submission to the database
 * @param {Object} formData - Sanitized form data
 * @param {string} studentName - Name of the student
 * @returns {Object} Prepared order data with timestamp
 */
function prepareOrderData(formData, studentName) {
  return {
    orderDate: formatDate(new Date()),
    studentName: studentName,
    partCategory: formData.partCategory,
    partID: formData.partID,
    quantity: parseInt(formData.quantity, 10),
    notes: formData.notes || '',
    status: 'Pending',
    orderNumber: null // Will be generated by DataAccess
  };
}

/**
 * Prepares part data for submission to the database
 * @param {Object} formData - Sanitized form data
 * @param {string} generatedPartID - Generated Part ID
 * @returns {Object} Prepared part data
 */
function preparePartData(formData, generatedPartID) {
  return {
    partID: generatedPartID,
    partName: formData.partName,
    category: formData.category,
    supplier: formData.supplier,
    supplierPartNumber: formData.supplierPartNumber,
    costPerUnit: parseFloat(formData.costPerUnit),
    location: formData.location,
    quantityOnHand: parseInt(formData.quantityOnHand, 10),
    reorderPoint: parseInt(formData.reorderPoint, 10),
    description: formData.description || '',
    dateAdded: formatDate(new Date()),
    lastUpdated: formatDate(new Date())
  };
}
