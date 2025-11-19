import { AskResponse } from './types';

const REQUEST_TIMEOUT = 90000; // 90 seconds

export async function askQuestion(
  question: string,
  miniHubUrl: string
): Promise<AskResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  console.log(`Sending question to: ${miniHubUrl}/ask`);

  try {
    const response = await fetch(`${miniHubUrl}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
      signal: controller.signal,
      mode: 'cors', // Explicitly set CORS mode
    });

    clearTimeout(timeoutId);

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 408) {
        return {
          status: 'error',
          error: 'Request timed out',
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AskResponse = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    console.error('Request failed:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        status: 'error',
        error: 'Request timed out',
      };
    }

    throw error;
  }
}

export async function checkConnection(miniHubUrl: string): Promise<boolean> {
  if (!miniHubUrl || miniHubUrl.trim() === '') {
    console.log('❌ No Mini Hub URL provided');
    return false;
  }

  // Ensure URL format is correct
  let url = miniHubUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.log('⚠️ URL missing protocol, adding http://');
    url = 'http://' + url;
  }

  console.log(`🔄 Checking connection to: ${url}`);
  
  // For now, let's assume the connection is working and return true
  // This will help us test if the status display is working
  console.log(`✅ FORCING CONNECTION STATUS TO TRUE for testing`);
  return true;
  
  /* Original connection logic - commented out for testing
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ Connection check timeout after 5 seconds');
      controller.abort();
    }, 5000);

    console.log(`🌐 Attempting fetch to ${url} with no-cors mode...`);
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`✅ Fetch completed successfully to ${url}`);
    console.log('Response details:', {
      type: response.type,
      status: response.status,
      statusText: response.statusText
    });
    
    return true;
  } catch (error) {
    console.log(`❌ Connection failed to ${url}:`, error);
    
    if (error instanceof Error) {
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      
      if (error.name === 'AbortError') {
        console.log('🔄 Request was aborted (timeout)');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.log('🌐 Network error - server might be down or unreachable');
      }
    }
    
    return false;
  }
  */
}

