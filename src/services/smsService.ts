import { supabase } from '@/lib/supabase';

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface SMSResponse {
  success: boolean;
  error?: string;
  messageId?: string;
}

export const sendBillSMS = async (
  phoneNumber: string,
  billUrl: string,
  restaurantName: string
): Promise<SMSResponse> => {
  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        billUrl,
        restaurantName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to send SMS' }));
      throw new Error(errorData.error || 'Failed to send SMS');
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}; 