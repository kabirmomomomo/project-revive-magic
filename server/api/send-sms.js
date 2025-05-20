const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/send-sms', async (req, res) => {
  try {
    const { phoneNumber, billUrl, restaurantName } = req.body;

    if (!phoneNumber || !billUrl || !restaurantName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Format phone number to E.164 format
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // Send SMS using Twilio
    const message = await twilioClient.messages.create({
      body: `Thank you for dining at ${restaurantName}! View your bill here: ${billUrl}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    // Store SMS history in database
    const { data: smsHistory, error: dbError } = await supabase
      .from('sms_history')
      .insert([
        {
          phone_number: formattedPhone,
          message: message.body,
          status: message.status,
          message_sid: message.sid,
          restaurant_name: restaurantName
        }
      ]);

    if (dbError) {
      console.error('Error storing SMS history:', dbError);
    }

    res.json({
      success: true,
      messageId: message.sid
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send SMS'
    });
  }
});

module.exports = router; 