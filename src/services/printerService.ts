import { BillOrder } from '@/types/bill';

interface PrinterConfig {
  ip: string;
  port: number;
  paperWidth: number;
}

export const printBill = async (
  bill: BillOrder,
  config: PrinterConfig
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/print-bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bill,
        printerConfig: config,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to print bill');
    }

    return { success: true };
  } catch (error) {
    console.error('Error printing bill:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 