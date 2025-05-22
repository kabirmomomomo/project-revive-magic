import { BillOrder } from '@/types/bill';

export const printBill = async (bill: BillOrder): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window');
    }

    // Create the HTML content for the bill
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .items {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .items th, .items td {
              padding: 5px;
              text-align: left;
            }
            .total {
              text-align: right;
              font-weight: bold;
              margin-top: 20px;
            }
            .customer-info {
              margin: 20px 0;
            }
            @media print {
              body {
                width: 80mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${bill.restaurantName || 'Restaurant'}</h2>
            <p>Bill Receipt</p>
          </div>
          
          <div class="customer-info">
            <p>Customer: ${bill.customer_name}</p>
            <p>Phone: ${bill.customer_phone}</p>
            <p>Date: ${new Date(bill.created_at).toLocaleString()}</p>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items.map(item => `
                <tr>
                  <td>${item.name}${item.variant_name ? ` (${item.variant_name})` : ''}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Total Amount: ₹${bill.total_amount}</p>
          </div>
        </body>
      </html>
    `;

    // Write the content to the new window
    printWindow.document.write(content);
    printWindow.document.close();

    // Wait for content to load
    printWindow.onload = () => {
      // Trigger print dialog
      printWindow.print();
      // Close the window after printing
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };

    return { success: true };
  } catch (error) {
    console.error('Error printing bill:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}; 