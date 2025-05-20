interface DiscoveredPrinter {
  ip: string;
  port: number;
  name?: string;
  status: 'online' | 'offline';
}

export const discoverPrinters = async (): Promise<DiscoveredPrinter[]> => {
  try {
    const response = await fetch('/api/discover-printers', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to discover printers');
    }

    return await response.json();
  } catch (error) {
    console.error('Error discovering printers:', error);
    return [];
  }
};

export const checkPrinterStatus = async (ip: string, port: number): Promise<boolean> => {
  try {
    const response = await fetch('/api/check-printer-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip, port }),
    });

    if (!response.ok) {
      throw new Error('Failed to check printer status');
    }

    const { status } = await response.json();
    return status === 'online';
  } catch (error) {
    console.error('Error checking printer status:', error);
    return false;
  }
}; 