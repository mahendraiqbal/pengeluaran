import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

// Helper function untuk membuat JSON response
function jsonResponse(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  return jsonResponse({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { telegramId, message } = body;
    
    if (!telegramId || !message) {
      return jsonResponse(
        { error: 'Missing required fields', received: { telegramId: !!telegramId, message: !!message } }, 
        { status: 400 }
      );
    }

    // Get Telegram Bot Token from environment
    // In React Router v7, process.env should be available in server-side routes
    // Try to get from process.env (Node.js environment)
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    // If not found, log available env vars for debugging
    if (!botToken) {
      const envKeys = Object.keys(process.env).filter(k => k.includes('TELEGRAM') || k.includes('TELE'));
      console.error('TELEGRAM_BOT_TOKEN not found in process.env');
      console.error('Available env vars with TELE:', envKeys);
      console.error('All env vars:', Object.keys(process.env).slice(0, 20));
      
      return jsonResponse(
        { 
          error: 'Telegram Bot Token not configured', 
          details: 'Please set TELEGRAM_BOT_TOKEN in your environment variables',
          hint: 'Create a .env file in the root directory with: TELEGRAM_BOT_TOKEN=your_bot_token',
          availableEnvVars: envKeys
        }, 
        { status: 500 }
      );
    }
    
    console.log('Telegram Bot Token found, length:', botToken.length);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: parseInt(telegramId),
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    // Clone response sebelum membaca
    const clonedResponse = response.clone();
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await clonedResponse.text();
      console.error('Failed to parse Telegram response:', text);
      return jsonResponse(
        { error: 'Invalid response from Telegram API', details: text.substring(0, 200) }, 
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      return jsonResponse(
        { 
          error: data.description || data.error || 'Failed to send Telegram message', 
          details: data,
          statusCode: response.status,
        }, 
        { status: response.status }
      );
    }

    return jsonResponse({ success: true, data });
  } catch (error: any) {
    console.error('Telegram API error:', error);
    return jsonResponse(
      { error: 'Internal server error', details: error?.message || String(error) }, 
      { status: 500 }
    );
  }
}

// Default export untuk route yang hanya API
export default function ApiTelegramSend() {
  return null;
}

