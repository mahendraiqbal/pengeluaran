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

// Normalize phone number: remove all non-digits, ensure starts with 62 (Indonesia country code)
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, "");
  
  // If starts with 0, replace with 62
  if (normalized.startsWith("0")) {
    normalized = "62" + normalized.substring(1);
  }
  
  // If doesn't start with 62, add it
  if (!normalized.startsWith("62")) {
    normalized = "62" + normalized;
  }
  
  return normalized;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Return 405 for GET requests
  return jsonResponse({ error: 'Method not allowed. Use POST.' }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { phone, message, instanceId, accessToken } = body;
    
    if (!phone || !message || !instanceId || !accessToken) {
      return jsonResponse(
        { error: 'Missing required fields', received: { phone: !!phone, message: !!message, instanceId: !!instanceId, accessToken: !!accessToken } }, 
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);

    // Format sesuai dokumentasi wawp.net
    // Mencoba beberapa endpoint yang mungkin benar
    const endpoints = [
      'https://wawp.net/wp-json/awp/v1/send',
      'https://wawp.net/api/send_message',
      'https://wawp.net/api/send',
    ];
    
    let response: Response | null = null;
    let lastError: any = null;
    
    // Coba setiap endpoint sampai berhasil
    for (const endpoint of endpoints) {
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            chatId: normalizedPhone + '@c.us', // Format chatId untuk WhatsApp
            type: 'text',
            message: message,
            instance_id: instanceId,
            access_token: accessToken,
          }),
        });
        
        // Jika response OK atau error yang jelas (bukan HTML), gunakan endpoint ini
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          break; // Endpoint ini benar
        }
        
        // Jika dapat HTML, coba endpoint berikutnya
        if (contentType && contentType.includes('text/html')) {
          response = null;
          continue;
        }
        
        // Jika status code 200-299 atau 400-599 (bukan redirect), mungkin benar
        if (response.status >= 200 && response.status < 600) {
          break;
        }
      } catch (error: any) {
        lastError = error;
        console.error(`Failed to fetch from ${endpoint}:`, error);
        response = null;
        continue;
      }
    }
    
    if (!response) {
      throw new Error(`Failed to connect to wawp.net API. Tried endpoints: ${endpoints.join(', ')}. Last error: ${lastError?.message || 'Unknown'}`);
    }

    // Clone response sebelum membaca untuk menghindari "Body has already been read" error
    const clonedResponse = response.clone();
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // Gunakan cloned response untuk membaca text jika json parsing gagal
      const text = await clonedResponse.text();
      console.error('Failed to parse response:', text);
      
      // Jika dapat HTML, berarti endpoint salah
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        return jsonResponse(
          { 
            error: 'Invalid API endpoint. Server returned HTML instead of JSON.', 
            details: 'Please check the correct API endpoint in wawp.net documentation.',
            triedEndpoints: endpoints
          }, 
          { status: 500 }
        );
      }
      
      return jsonResponse(
        { error: 'Invalid response from WhatsApp API', details: text.substring(0, 500) }, 
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      // Log detail lengkap untuk debugging
      console.error('wawp.net API error response:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        payload: {
          chatId: normalizedPhone + '@c.us',
          type: 'text',
          message: message.substring(0, 50) + '...',
          instance_id: instanceId,
          access_token: accessToken ? accessToken.substring(0, 10) + '...' : 'missing'
        }
      });
      
      // Return error dengan detail lengkap untuk debugging
      return jsonResponse(
        { 
          error: data.error || data.message || data.code || 'Failed to send message', 
          details: data,
          statusCode: response.status,
          statusText: response.statusText,
        }, 
        { status: response.status }
      );
    }

    return jsonResponse({ success: true, data });
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return jsonResponse(
      { error: 'Internal server error', details: error?.message || String(error) }, 
      { status: 500 }
    );
  }
}

// Default export untuk route yang hanya API - harus return null atau valid React component
export default function ApiWhatsAppSend() {
  return null;
}

