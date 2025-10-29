/**
 * Generates comprehensive sample parts data with all 4 spec fields populated
 * Creates 60-80 professional FRC parts across all categories
 */

const { google } = require('googleapis');
const path = require('path');

// Spreadsheet ID for Parts Directory
const PARTS_DIRECTORY_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';

// Sample parts data - professional FRC parts with realistic specs
const SAMPLE_PARTS = [
  // Fasteners - Screws
  ['FAST-001', 'Socket Head Cap Screw', 'Fasteners', 'Screws', 'WCP-0448', 'Socket Head', '8-32', '0.5"', 'Stainless Steel', 100, 8.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A1', 'Box of 100', 'Active', '2025-01-15', 'Setup'],
  ['FAST-002', 'Socket Head Cap Screw', 'Fasteners', 'Screws', 'WCP-0449', 'Socket Head', '10-24', '0.75"', 'Stainless Steel', 100, 10.49, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A1', 'Box of 100', 'Active', '2025-01-15', 'Setup'],
  ['FAST-003', 'Button Head Cap Screw', 'Fasteners', 'Screws', 'REV-21-1160', 'Button Head', '1/4-20', '1"', 'Stainless Steel', 50, 14.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A1', 'Box of 50', 'Active', '2025-01-15', 'Setup'],
  ['FAST-004', 'Flat Head Socket Screw', 'Fasteners', 'Screws', 'WCP-0450', 'Flat Head', '8-32', '0.625"', 'Stainless Steel', 100, 11.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A1', 'Box of 100', 'Active', '2025-01-15', 'Setup'],

  // Fasteners - Nuts
  ['FAST-005', 'Hex Lock Nut', 'Fasteners', 'Nuts', 'WCP-0451', 'Lock Nut', '8-32', '', 'Nylon Insert', 100, 7.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A2', 'Box of 100', 'Active', '2025-01-15', 'Setup'],
  ['FAST-006', 'Hex Lock Nut', 'Fasteners', 'Nuts', 'WCP-0452', 'Lock Nut', '10-24', '', 'Nylon Insert', 100, 8.49, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A2', 'Box of 100', 'Active', '2025-01-15', 'Setup'],
  ['FAST-007', 'Hex Nut', 'Fasteners', 'Nuts', 'REV-21-1161', 'Hex Nut', '1/4-20', '', 'Stainless Steel', 100, 6.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A2', 'Box of 100', 'Active', '2025-01-15', 'Setup'],

  // Fasteners - Washers
  ['FAST-008', 'Flat Washer', 'Fasteners', 'Washers', 'WCP-0453', 'Flat', '#8', '', 'Stainless Steel', 100, 4.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A3', 'Box of 100', 'Active', '2025-01-15', 'Setup'],
  ['FAST-009', 'Flat Washer', 'Fasteners', 'Washers', 'WCP-0454', 'Flat', '#10', '', 'Stainless Steel', 100, 5.49, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A3', 'Box of 100', 'Active', '2025-01-15', 'Setup'],
  ['FAST-010', 'Lock Washer', 'Fasteners', 'Washers', 'WCP-0455', 'Split Lock', '1/4"', '', 'Steel', 100, 5.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A3', 'Box of 100', 'Active', '2025-01-15', 'Setup'],

  // Fasteners - Rivets
  ['FAST-011', 'Pop Rivet', 'Fasteners', 'Rivets', 'AM-3847', 'Pop Rivet', '1/8"', '0.125-0.250"', 'Aluminum', 50, 12.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A4', 'Box of 50', 'Active', '2025-01-15', 'Setup'],
  ['FAST-012', 'Pop Rivet', 'Fasteners', 'Rivets', 'AM-3848', 'Pop Rivet', '3/16"', '0.250-0.375"', 'Aluminum', 50, 14.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A4', 'Box of 50', 'Active', '2025-01-15', 'Setup'],

  // Fasteners - Adhesive
  ['FAST-013', 'Thread Locker', 'Fasteners', 'Adhesive', 'LOC-243', 'Thread Locker', 'Medium', '', '', 5, 8.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A5', 'Blue strength', 'Active', '2025-01-15', 'Setup'],
  ['FAST-014', 'Epoxy Adhesive', 'Fasteners', 'Adhesive', 'EP-3002', 'Epoxy', 'High Strength', '', '', 3, 12.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Bin A5', '2-part structural', 'Active', '2025-01-15', 'Setup'],

  // Electronics and Sensors - Motor Controllers
  ['ELEC-001', 'Spark MAX', 'Electronics and Sensors', 'Motor Controllers', 'REV-11-1105', 'Brushless', '40A', '', '', 8, 89.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf B1', 'For NEO motors', 'Active', '2025-01-15', 'Setup'],
  ['ELEC-002', 'Talon SRX', 'Electronics and Sensors', 'Motor Controllers', 'CTRE-217-6515', 'Brushed', '40A', '', '', 6, 99.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf B1', 'CAN compatible', 'Active', '2025-01-15', 'Setup'],
  ['ELEC-003', 'Talon FX', 'Electronics and Sensors', 'Motor Controllers', 'CTRE-217-6515', 'Brushless', '40A', '', '', 4, 134.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf B1', 'Integrated Falcon 500', 'Active', '2025-01-15', 'Setup'],

  // Electronics and Sensors - Sensors
  ['ELEC-004', 'Color Sensor V3', 'Electronics and Sensors', 'Sensors', 'REV-31-1595', 'Color', 'I2C', '', '', 3, 59.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf B2', 'RGB detection', 'Active', '2025-01-15', 'Setup'],
  ['ELEC-005', 'Through Bore Encoder', 'Electronics and Sensors', 'Sensors', 'REV-11-1271', 'Encoder', 'Absolute', '', '', 4, 79.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf B2', 'Magnetic absolute', 'Active', '2025-01-15', 'Setup'],
  ['ELEC-006', 'Limit Switch', 'Electronics and Sensors', 'Sensors', 'AM-3104', 'Limit Switch', 'Digital', '', '', 12, 4.99, 'AndyMark', 'https://www.andymark.com', 'Shelf B2', 'Mechanical endstop', 'Active', '2025-01-15', 'Setup'],
  ['ELEC-007', 'Ultrasonic Sensor', 'Electronics and Sensors', 'Sensors', 'AM-2899', 'Ultrasonic', 'Analog', '', '', 5, 29.99, 'AndyMark', 'https://www.andymark.com', 'Shelf B2', 'Distance measurement', 'Active', '2025-01-15', 'Setup'],

  // Electronics and Sensors - Power Distribution
  ['ELEC-008', 'Power Distribution Hub', 'Electronics and Sensors', 'Power Distribution', 'REV-11-1850', 'PDH', '20 Channels', '', '', 2, 149.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf B3', 'Central distribution', 'Active', '2025-01-15', 'Setup'],
  ['ELEC-009', 'Voltage Regulator', 'Electronics and Sensors', 'Power Distribution', 'REV-11-1107', 'Buck Converter', '12V to 5V', '', '', 6, 19.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf B3', '2A output', 'Active', '2025-01-15', 'Setup'],

  // Raw Stock - Aluminum
  ['STOCK-001', 'Aluminum Sheet', 'Raw Stock', 'Aluminum', '', 'Sheet', '12" x 24"', '0.063"', '6061-T6', 8, 24.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C1', 'Structural panels', 'Active', '2025-01-15', 'Setup'],
  ['STOCK-002', 'Aluminum Sheet', 'Raw Stock', 'Aluminum', '', 'Sheet', '12" x 24"', '0.125"', '6061-T6', 6, 39.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C1', 'Heavy duty panels', 'Active', '2025-01-15', 'Setup'],
  ['STOCK-003', 'Aluminum Tube 6ft', 'Raw Stock', 'Aluminum', '', 'Tube', '1" x 1"', '0.0625" Wall', '6061-T6', 4, 29.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C2', 'Square tube', 'Active', '2025-01-15', 'Setup'],
  ['STOCK-004', 'Aluminum Tube 6ft', 'Raw Stock', 'Aluminum', '', 'Tube', '2" x 1"', '0.0625" Wall', '6061-T6', 4, 39.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C2', 'Rectangular tube', 'Active', '2025-01-15', 'Setup'],
  ['STOCK-005', 'Aluminum Angle 6ft', 'Raw Stock', 'Aluminum', '', 'Angle', '1" x 1"', '0.0625" Wall', '6061-T6', 5, 19.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C3', 'L-bracket stock', 'Active', '2025-01-15', 'Setup'],

  // Raw Stock - Polycarbonate
  ['STOCK-006', 'Polycarbonate Sheet', 'Raw Stock', 'Polycarbonate', '', 'Sheet', '12" x 24"', '0.093"', '', 7, 34.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C4', 'Clear impact resistant', 'Active', '2025-01-15', 'Setup'],
  ['STOCK-007', 'Polycarbonate Sheet', 'Raw Stock', 'Polycarbonate', '', 'Sheet', '12" x 24"', '0.187"', '', 5, 49.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C4', 'Heavy duty clear', 'Active', '2025-01-15', 'Setup'],

  // Raw Stock - Steel
  ['STOCK-008', 'Steel Flat Bar 3ft', 'Raw Stock', 'Steel', '', 'Flat Bar', '1" x 1/8"', '1/8"', 'A36', 6, 12.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Rack C5', 'Mild steel', 'Active', '2025-01-15', 'Setup'],

  // Movement - Motors
  ['MOVE-001', 'NEO Brushless Motor', 'Movement', 'Motors', 'REV-21-1650', 'Brushless', '550 Size', '5880 RPM', '', 10, 49.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf D1', 'High torque', 'Active', '2025-01-15', 'Setup'],
  ['MOVE-002', 'NEO 550 Motor', 'Movement', 'Motors', 'REV-21-1651', 'Brushless', '550 Size', '11000 RPM', '', 8, 39.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf D1', 'Compact high speed', 'Active', '2025-01-15', 'Setup'],
  ['MOVE-003', 'Falcon 500', 'Movement', 'Motors', 'CTRE-217-6515', 'Brushless', 'Falcon Size', '6380 RPM', '', 6, 184.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D1', 'Integrated controller', 'Active', '2025-01-15', 'Setup'],
  ['MOVE-004', 'CIM Motor', 'Movement', 'Motors', 'AM-0255', 'Brushed', 'CIM Size', '5330 RPM', '', 12, 34.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D1', 'Classic FRC motor', 'Active', '2025-01-15', 'Setup'],

  // Movement - Bearings
  ['MOVE-005', 'Ball Bearing', 'Movement', 'Bearings', 'WCP-0352', 'Ball Bearing', '0.5" Bore', '1.125" OD', '', 6, 12.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D2', 'Pack of 2', 'Active', '2025-01-15', 'Setup'],
  ['MOVE-006', 'Ball Bearing', 'Movement', 'Bearings', 'WCP-0353', 'Ball Bearing', '0.375" Bore', '1.125" OD', '', 8, 11.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D2', 'Pack of 2', 'Active', '2025-01-15', 'Setup'],
  ['MOVE-007', 'Flanged Bearing', 'Movement', 'Bearings', 'WCP-0354', 'Flanged', '0.5" Bore', '1.125" OD', '', 6, 14.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D2', 'Pack of 2', 'Active', '2025-01-15', 'Setup'],

  // Movement - Gearboxes
  ['MOVE-008', 'VersaPlanetary Stage', 'Movement', 'Gearboxes', 'VEX-217-6008', 'Planetary', '10:1', 'Single', '', 4, 49.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D3', 'Modular stage', 'Active', '2025-01-15', 'Setup'],
  ['MOVE-009', 'Single Speed Gearbox', 'Movement', 'Gearboxes', 'AM-2544', 'Spur', '12:1', 'Single', '', 3, 89.99, 'AndyMark', 'https://www.andymark.com', 'Shelf D3', '2 CIM configuration', 'Active', '2025-01-15', 'Setup'],

  // Movement - Chain
  ['MOVE-010', 'Roller Chain 10ft', 'Movement', 'Chain', 'VEX-217-2611', '#25 Pitch', '', '', '', 5, 19.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D4', 'Standard pitch', 'Active', '2025-01-15', 'Setup'],

  // Movement - Sprockets
  ['MOVE-011', 'Sprocket', 'Movement', 'Sprockets', 'VEX-217-2614', '#25 Pitch', '18 Tooth', '0.5" Hex', '', 15, 8.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D5', 'Hex bore', 'Active', '2025-01-15', 'Setup'],
  ['MOVE-012', 'Sprocket', 'Movement', 'Sprockets', 'VEX-217-2615', '#25 Pitch', '24 Tooth', '0.5" Hex', '', 12, 9.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf D5', 'Hex bore', 'Active', '2025-01-15', 'Setup'],

  // Build Site Equipment - Power Tools
  ['BSITE-001', 'Cordless Drill', 'Build Site Equipment', 'Power Tools', 'DEW-DCD771C2', 'Drill', '18V', '', '', 2, 129.99, 'Home Depot', 'https://www.homedepot.com', 'Tool Cabinet', 'General assembly', 'Active', '2025-01-15', 'Setup'],
  ['BSITE-002', 'Impact Driver', 'Build Site Equipment', 'Power Tools', 'DEW-DCF887B', 'Impact', '18V', '', '', 2, 149.99, 'Home Depot', 'https://www.homedepot.com', 'Tool Cabinet', 'High torque', 'Active', '2025-01-15', 'Setup'],

  // Build Site Equipment - Cleaning
  ['BSITE-003', 'Shop Vacuum', 'Build Site Equipment', 'Cleaning', 'RID-WD0650', 'Wet/Dry Vac', '5 Gallon', '', '', 1, 79.99, 'Home Depot', 'https://www.homedepot.com', 'Storage Room', 'Dust collection', 'Active', '2025-01-15', 'Setup'],

  // Build Site Equipment - Lighting
  ['BSITE-004', 'LED Work Light', 'Build Site Equipment', 'Lighting', 'RYO-P717', 'LED', '2000 Lumens', '', '', 3, 49.99, 'Home Depot', 'https://www.homedepot.com', 'Storage Room', 'Portable lighting', 'Active', '2025-01-15', 'Setup'],

  // Pneumatics - Cylinders
  ['PNEU-001', 'Single Acting Cylinder', 'Pneumatics', 'Cylinders', 'VEX-217-2779', 'Single Acting', '0.75" Bore', '2" Stroke', '', 4, 34.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf E1', 'Aluminum body', 'Active', '2025-01-15', 'Setup'],
  ['PNEU-002', 'Double Acting Cylinder', 'Pneumatics', 'Cylinders', 'VEX-217-2780', 'Double Acting', '1" Bore', '4" Stroke', '', 3, 59.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf E1', 'Aluminum body', 'Active', '2025-01-15', 'Setup'],

  // Pneumatics - Valves
  ['PNEU-003', 'Solenoid Valve', 'Pneumatics', 'Valves', 'VEX-217-2752', 'Solenoid', 'Single', '12V', '', 8, 29.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf E2', 'Electronic control', 'Active', '2025-01-15', 'Setup'],
  ['PNEU-004', 'Double Solenoid', 'Pneumatics', 'Valves', 'VEX-217-2753', 'Double Solenoid', 'Double', '12V', '', 6, 39.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf E2', 'Dual action', 'Active', '2025-01-15', 'Setup'],

  // Pneumatics - Regulators
  ['PNEU-005', 'Pressure Regulator', 'Pneumatics', 'Regulators', 'VEX-217-2757', 'Adjustable', '0-125 PSI', '', '', 4, 24.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf E3', 'Pressure control', 'Active', '2025-01-15', 'Setup'],

  // Pneumatics - Tubing
  ['PNEU-006', 'Pneumatic Tubing 25ft', 'Pneumatics', 'Tubing', 'VEX-217-2761', 'Polyurethane', '1/4" OD', '', '', 3, 19.99, 'VEXpro', 'https://www.vexrobotics.com', 'Shelf E4', 'Flexible air line', 'Active', '2025-01-15', 'Setup'],

  // Business, Outreach, Media - Apparel
  ['BUSI-001', 'Team Polo Shirt', 'Business, Outreach, Media', 'Apparel', 'CI-POLO-L-PUR', 'Polo', 'Large', 'Purple', '', 15, 24.99, 'Custom Ink', 'https://www.customink.com', 'Storage', 'Team branding', 'Active', '2025-01-15', 'Setup'],
  ['BUSI-002', 'Team T-Shirt', 'Business, Outreach, Media', 'Apparel', 'CI-TSHIRT-M-GLD', 'T-Shirt', 'Medium', 'Gold', '', 20, 14.99, 'Custom Ink', 'https://www.customink.com', 'Storage', 'Casual wear', 'Active', '2025-01-15', 'Setup'],

  // Business, Outreach, Media - Display
  ['BUSI-003', 'Banner Stand', 'Business, Outreach, Media', 'Display', 'VP-BANNER-36', 'Retractable', '36" x 80"', '', '', 2, 89.99, 'Vistaprint', 'https://www.vistaprint.com', 'Storage', 'Outreach events', 'Active', '2025-01-15', 'Setup'],

  // Business, Outreach, Media - Marketing
  ['BUSI-004', 'Business Cards', 'Business, Outreach, Media', 'Marketing', 'VP-BC-500', 'Business Card', '3.5" x 2"', '', '', 500, 29.99, 'Vistaprint', 'https://www.vistaprint.com', 'Storage', 'Box of 500', 'Active', '2025-01-15', 'Setup'],

  // Machining Tools - Cutting Tools
  ['MACH-001', 'End Mill', 'Machining Tools', 'Cutting Tools', 'MC-8908A21', 'End Mill', '1/4"', '4', 'Carbide', 6, 24.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Tool Cabinet', 'Milling cutter', 'Active', '2025-01-15', 'Setup'],
  ['MACH-002', 'Drill Bit Set', 'Machining Tools', 'Cutting Tools', 'MC-2936A59', 'Twist Drill', '1/16" - 1/2"', '', 'HSS', 2, 49.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Tool Cabinet', 'Set of 29 bits', 'Active', '2025-01-15', 'Setup'],

  // Machining Tools - Threading Tools
  ['MACH-003', 'Tap Set', 'Machining Tools', 'Threading Tools', 'MC-2546A13', 'Tap', '8-32 to 1/4-20', '', '', 2, 49.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Tool Cabinet', 'Thread cutting', 'Active', '2025-01-15', 'Setup'],

  // Machining Tools - Measuring Tools
  ['MACH-004', 'Digital Caliper', 'Machining Tools', 'Measuring Tools', 'MC-2296A35', 'Caliper', '0-6"', '0.001"', '', 4, 39.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Tool Cabinet', 'Precision measuring', 'Active', '2025-01-15', 'Setup'],

  // Safety Equipment - Eye Protection
  ['SAFE-001', 'Safety Glasses', 'Safety Equipment', 'Eye Protection', 'GR-60594', 'Glasses', 'ANSI Z87.1', '', '', 20, 4.99, 'Grainger', 'https://www.grainger.com', 'Safety Station', 'Impact resistant', 'Active', '2025-01-15', 'Setup'],
  ['SAFE-002', 'Face Shield', 'Safety Equipment', 'Eye Protection', 'GR-60596', 'Shield', 'ANSI Z87.1', '', '', 8, 14.99, 'Grainger', 'https://www.grainger.com', 'Safety Station', 'Full face protection', 'Active', '2025-01-15', 'Setup'],

  // Safety Equipment - Hand Protection
  ['SAFE-003', 'Work Gloves', 'Safety Equipment', 'Hand Protection', 'GR-60598', 'Gloves', 'Large', 'Cut Level 3', '', 12, 9.99, 'Grainger', 'https://www.grainger.com', 'Safety Station', 'Pairs available', 'Active', '2025-01-15', 'Setup'],

  // Safety Equipment - Medical
  ['SAFE-004', 'First Aid Kit', 'Safety Equipment', 'Medical', 'GR-60600', 'First Aid', '50 Person', '', '', 2, 49.99, 'Grainger', 'https://www.grainger.com', 'Safety Station', 'OSHA compliant', 'Active', '2025-01-15', 'Setup'],

  // Wiring, Cables, Connectors - Wires
  ['WIRE-001', 'Power Wire 10ft', 'Wiring, Cables, Connectors', 'Wires', 'REV-31-1436', 'Power', '12 AWG', '10 ft', 'Red', 8, 14.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf F1', 'Stranded copper', 'Active', '2025-01-15', 'Setup'],
  ['WIRE-002', 'Power Wire 10ft', 'Wiring, Cables, Connectors', 'Wires', 'REV-31-1437', 'Power', '12 AWG', '10 ft', 'Black', 8, 14.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf F1', 'Stranded copper', 'Active', '2025-01-15', 'Setup'],
  ['WIRE-003', 'Signal Wire 25ft', 'Wiring, Cables, Connectors', 'Wires', 'REV-31-1438', 'Signal', '22 AWG', '25 ft', 'Multi-Color', 4, 9.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf F1', 'Solid core', 'Active', '2025-01-15', 'Setup'],

  // Wiring, Cables, Connectors - Cables
  ['WIRE-004', 'CAN Bus Cable 6ft', 'Wiring, Cables, Connectors', 'Cables', 'CTRE-270-2466', 'CAN', '6 ft', '', '', 10, 12.99, 'CTRE', 'https://store.ctr-electronics.com', 'Shelf F2', 'Shielded twisted pair', 'Active', '2025-01-15', 'Setup'],
  ['WIRE-005', 'PWM Cable', 'Wiring, Cables, Connectors', 'Cables', 'REV-31-1440', 'PWM', '12"', '', '', 15, 8.99, 'REV Robotics', 'https://www.revrobotics.com', 'Shelf F2', 'Pack of 5', 'Active', '2025-01-15', 'Setup'],

  // Wiring, Cables, Connectors - Connectors
  ['WIRE-006', 'Anderson Powerpole', 'Wiring, Cables, Connectors', 'Connectors', 'PW-PP45-10', 'Power', '45A', '', '', 20, 3.99, 'PowerWerx', 'https://powerwerx.com', 'Shelf F3', 'Pairs available', 'Active', '2025-01-15', 'Setup'],
  ['WIRE-007', 'Wago Connector', 'Wiring, Cables, Connectors', 'Connectors', 'MC-7527K62', 'Wire Nut', '2-Port', '', '', 30, 12.99, 'McMaster-Carr', 'https://www.mcmaster.com', 'Shelf F3', 'Pack of 10', 'Active', '2025-01-15', 'Setup']
];

async function generateSampleParts() {
  try {
    console.log('Loading Google Sheets API credentials...');

    // Load credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '..', 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log('Clearing existing Parts data (keeping headers)...');

    // Get the sheet to check how many rows exist
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Parts!A:A'
    });

    const rowCount = currentData.data.values ? currentData.data.values.length : 1;

    if (rowCount > 1) {
      // Clear data rows but keep header
      await sheets.spreadsheets.values.clear({
        spreadsheetId: PARTS_DIRECTORY_ID,
        range: `Parts!A2:R${rowCount}`
      });
      console.log(`Cleared ${rowCount - 1} existing rows`);
    }

    console.log(`Writing ${SAMPLE_PARTS.length} sample parts...`);

    // Write sample parts data
    await sheets.spreadsheets.values.append({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Parts!A2',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: SAMPLE_PARTS
      }
    });

    console.log('Sample parts added successfully');
    console.log('');
    console.log('SUCCESS: Generated sample parts data');
    console.log(`Total parts: ${SAMPLE_PARTS.length}`);
    console.log('');
    console.log('Parts breakdown by category:');

    // Count parts per category
    const categoryCounts = {};
    SAMPLE_PARTS.forEach(part => {
      const category = part[2];
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} parts`);
    });

  } catch (error) {
    console.error('ERROR generating sample parts:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  generateSampleParts()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateSampleParts };
