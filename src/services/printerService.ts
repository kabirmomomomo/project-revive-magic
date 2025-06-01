import { BillOrder } from '@/types/bill';
import * as qz from 'qz-tray';
import { sha256 } from 'js-sha256';
import { initQz } from './initQz';

// QZ Tray integration for direct printing
// Make sure QZ Tray is installed and running: https://qz.io/download/
// If using npm: npm install qz-tray
// If using CDN, add <script src="https://cdn.jsdelivr.net/npm/qz-tray@2.1.0/qz-tray.js"></script> to your index.html

// Add type declarations for global libraries
declare global {
  interface Window {
    RSVP: any;
    CryptoJS: any;
  }
}

const PRINTER_STORAGE_KEY = 'selected_printer';

// Function to check if required libraries are loaded
const checkLibraries = () => {
  if (!window.RSVP) {
    throw new Error('RSVP library is not loaded. Please ensure rsvp.min.js is included.');
  }
  if (!window.CryptoJS) {
    throw new Error('CryptoJS library is not loaded. Please ensure crypto-js.min.js is included.');
  }
};

// Function to find all available printers
export const findPrinters = async (): Promise<string[]> => {
  try {
    initQz();
    checkLibraries();
    const printers = await qz.printers.find();
    console.log(printers);
    return printers;
  } catch (error) {
    console.error('Error finding printers:', error);
    throw error;
  }
};

// Function to get the selected printer
export const getSelectedPrinter = (): string | null => {
  return localStorage.getItem(PRINTER_STORAGE_KEY);
};

// Function to set the selected printer
export const setSelectedPrinter = (printerName: string) => {
  localStorage.setItem(PRINTER_STORAGE_KEY, printerName);
};

// Function to connect to QZ Tray
export const connectToQZTray = async (): Promise<boolean> => {
  try {
    initQz();
    checkLibraries();
    
    // Check if already connected
    if (qz.websocket.isActive()) {
      return true; // Already connected
    }
    
    await qz.websocket.connect();
    return true;
  } catch (error) {
    console.error('Error connecting to QZ Tray:', error);
    throw error;
  }
};

// Function to find a specific printer
export const findSpecificPrinter = async (printerName: string): Promise<string> => {
  try {
    initQz();
    checkLibraries();
    const printer = await qz.printers.find(printerName);
    return printer;
  } catch (error) {
    console.error('Error finding specific printer:', error);
    throw error;
  }
};

export const printBill = async (bill: BillOrder): Promise<{ success: boolean; error?: string }> => {
  try {
    initQz();
    checkLibraries();

    // Connect to QZ Tray
    await connectToQZTray();

    // Get all available printers
    const printers = await findPrinters();
    console.log('Available printers:', printers);

    if (!printers || printers.length === 0) {
      throw new Error('No printers found. Please ensure a printer is connected and configured.');
    }

    // Get the selected printer or prompt for selection
    let selectedPrinter = getSelectedPrinter();
    
    if (!selectedPrinter || !printers.includes(selectedPrinter)) {
      // If no printer is selected or the selected printer is not available,
      // use the first available printer
      selectedPrinter = printers[0];
      setSelectedPrinter(selectedPrinter);
    }

    console.log('Using printer:', selectedPrinter);

    // Create printer config
    const config = qz.configs.create(selectedPrinter);

    // Format the bill as plain text (customize as needed)
    const data = [
      `${bill.restaurantName || 'Restaurant'}\n`,
      '-----------------------------\n',
      `Customer: ${bill.customer_name}\n`,
      `Phone: ${bill.customer_phone}\n`,
      `Date: ${new Date(bill.created_at).toLocaleString()}\n`,
      bill.payment_mode ? `Payment Mode: ${bill.payment_mode}\n` : '',
      '\nItems:\n',
      ...bill.items.map(item =>
        `${item.quantity}x ${item.name}${item.variant_name ? ` (${item.variant_name})` : ''} - ₹${item.price}\n`
      ),
      '-----------------------------\n',
      `Total: ₹${bill.total_amount}\n`,
      '\nThank you!\n'
    ];

    // Print the bill
    await qz.print(config, data);
    
    // Don't disconnect after printing to maintain the connection for future prints
    // await qz.websocket.disconnect();

    return { success: true };
  } catch (error) {
    console.error('Error printing bill (QZ Tray):', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 