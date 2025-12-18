import { json } from "@remix-run/node";

export async function action({ request }: { request: Request }) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { phone, message, apiKey } = await request.json();
    
    if (!phone || !message || !apiKey) {
      return json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    const response = await fetch('https://wawp.net/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        phone: phone,
        message: message,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return json(
        { error: data.error || 'Failed to send message' }, 
        { status: response.status }
      );
    }

    return json({ success: true, data });
  } catch (error) {
    console.error('WhatsApp API error:', error);
    return json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
