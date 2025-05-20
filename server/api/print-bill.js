const express = require('express');
const router = express.Router();
const net = require('net');

router.post('/print-bill', async (req, res) => {
  try {
    const { bill, printerConfig } = req.body;

    if (!bill || !printerConfig) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create ESC/POS commands for the bill
    const commands = generateESCCommands(bill, printerConfig);

    // Send commands to printer
    await sendToPrinter(commands, printerConfig);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error printing bill:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

function generateESCCommands(bill, config) {
  const commands = [];
  const { paperWidth } = config;

  // Initialize printer
  commands.push('\x1B\x40'); // Initialize printer
  commands.push('\x1B\x61\x01'); // Center alignment

  // Print header
  commands.push('\x1B\x21\x30'); // Normal text
  commands.push(`${bill.restaurantName}\n`);
  commands.push('\x1B\x21\x08'); // Bold text
  commands.push('BILL\n');
  commands.push('\x1B\x21\x00'); // Normal text

  // Print bill details
  commands.push(`Bill #: ${bill.id}\n`);
  commands.push(`Date: ${new Date(bill.created_at).toLocaleString()}\n`);
  commands.push(`Customer: ${bill.customer_name}\n`);
  commands.push(`Phone: ${bill.customer_phone}\n\n`);

  // Print items
  commands.push('\x1B\x61\x00'); // Left alignment
  commands.push('--------------------------------\n');
  commands.push('Item                    Amount\n');
  commands.push('--------------------------------\n');

  bill.items.forEach(item => {
    const itemName = item.name.padEnd(20);
    const quantity = `${item.quantity}x`;
    const price = `₹${(item.price * item.quantity).toFixed(2)}`;
    commands.push(`${itemName} ${quantity} ${price}\n`);
    if (item.variant_name) {
      commands.push(`  ${item.variant_name}\n`);
    }
  });

  // Print total
  commands.push('--------------------------------\n');
  commands.push('\x1B\x21\x08'); // Bold text
  commands.push(`Total:                    ₹${bill.total_amount.toFixed(2)}\n`);
  commands.push('\x1B\x21\x00'); // Normal text
  commands.push('--------------------------------\n\n');

  // Print footer
  commands.push('\x1B\x61\x01'); // Center alignment
  commands.push('Thank you for dining with us!\n');
  commands.push('Please visit again\n\n\n\n\n'); // Feed paper

  return commands.join('');
}

async function sendToPrinter(commands, config) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const { ip, port } = config;

    client.connect(port, ip, () => {
      client.write(commands, (err) => {
        if (err) {
          reject(err);
        } else {
          client.end();
          resolve();
        }
      });
    });

    client.on('error', (err) => {
      reject(err);
    });

    // Set timeout
    client.setTimeout(5000);
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

module.exports = router; 