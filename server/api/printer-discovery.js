const express = require('express');
const router = express.Router();
const net = require('net');
const dns = require('dns');

// Common ports for network printers
const COMMON_PORTS = [9100, 515, 631, 5150];

// Scan a single IP address for printers
async function scanIP(ip) {
  const results = [];
  
  for (const port of COMMON_PORTS) {
    try {
      const isOpen = await checkPort(ip, port);
      if (isOpen) {
        results.push({
          ip,
          port,
          status: 'online'
        });
      }
    } catch (error) {
      console.error(`Error scanning ${ip}:${port}:`, error);
    }
  }
  
  return results;
}

// Check if a port is open
function checkPort(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000; // 1 second timeout
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

// Discover printers on the network
router.get('/discover-printers', async (req, res) => {
  try {
    const localIP = req.socket.localAddress;
    const ipParts = localIP.split('.');
    const baseIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
    
    const discoveredPrinters = [];
    
    // Scan the local network (last octet 1-254)
    for (let i = 1; i <= 254; i++) {
      const ip = `${baseIP}.${i}`;
      const results = await scanIP(ip);
      discoveredPrinters.push(...results);
    }
    
    res.json(discoveredPrinters);
  } catch (error) {
    console.error('Error discovering printers:', error);
    res.status(500).json({ error: 'Failed to discover printers' });
  }
});

// Check printer status
router.post('/check-printer-status', async (req, res) => {
  try {
    const { ip, port } = req.body;
    
    if (!ip || !port) {
      return res.status(400).json({ error: 'IP and port are required' });
    }
    
    const isOnline = await checkPort(ip, port);
    
    res.json({
      status: isOnline ? 'online' : 'offline'
    });
  } catch (error) {
    console.error('Error checking printer status:', error);
    res.status(500).json({ error: 'Failed to check printer status' });
  }
});

module.exports = router; 