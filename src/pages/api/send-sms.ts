import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: Request,
  res: Response
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, billUrl, restaurantName } = req.body;

    if (!phoneNumber || !billUrl || !restaurantName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Twilio credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ error: 'Twilio configuration missing' });
    }

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
          To: phoneNumber,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send SMS');
    }

    // Store SMS record in database
    const { error: dbError } = await supabase.from('sms_history').insert({
      phone_number: phoneNumber,
      message: message,
      bill_url: billUrl,
      status: 'sent',
    });

    if (dbError) {
      console.error('Error storing SMS record:', dbError);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 