const express = require('express');
const cors = require('cors');
const smsRouter = require('./api/send-sms');
const printerRouter = require('./api/print-bill');
const printerDiscoveryRouter = require('./api/printer-discovery');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Routes
app.use('/api', smsRouter);
app.use('/api', printerRouter);
app.use('/api', printerDiscoveryRouter);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 