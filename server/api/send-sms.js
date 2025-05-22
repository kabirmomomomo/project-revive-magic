const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
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

    // Get Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ error: 'Twilio configuration missing' });
    }

    // Format phone number to E.164 format
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // Create message body
    const message = `Thank you for dining at ${restaurantName}! Your bill is available here: ${billUrl}`;

    // Send SMS using Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    const data = await response.json();

    // Store SMS record in database
    const { error: dbError } = await supabase.from('sms_history').insert({
      phone_number: formattedPhone,
      message: message,
      bill_url: billUrl,
      status: 'sent',
      message_sid: data.sid
    });

    if (dbError) {
      console.error('Error storing SMS record:', dbError);
    }

    return res.status(200).json({ 
      success: true,
      messageId: data.sid
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

module.exports = router; 