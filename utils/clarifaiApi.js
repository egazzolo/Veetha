// ============================================
// CLARIFAI API INTEGRATION
// Food Recognition using Clarifai's food-item-v1-recognition model
// ============================================

import { supabase } from './supabase';

const CLARIFAI_API_URL = 'https://api.clarifai.com/v2/users/clarifai/apps/main/models/food-item-v1-recognition/outputs';

const CLARIFAI_PATS = [
  '2d1d8118c5f24171873a0f6d5c877b10',   // Account 1 - 1000 free requests
  '61cccd8ce09a4192b0b60e0394738893',  // Account 2 - another 1000 free
  // -- Total Clarifai requests this month (RUN IN SUPABASE SQL TO SEE HOW MANY REQUESTS HAVE BEEN MADE)
      //SELECT COUNT(*) as requests_this_month
      //FROM api_tracking
      //WHERE 
      //service = 'clarifai' 
      //AND created_at >= date_trunc('month', CURRENT_DATE);
];

const REQUESTS_PER_ACCOUNT = 950;

/**
 * Analyze a photo using Clarifai's food recognition model
 * @param {string} imageBase64 - Base64 encoded image data (without data:image prefix)
 * @returns {Promise<Object>} - { foodName, confidence } or throws error
 */

// Get current PAT based on usage
const getCurrentPAT = async () => {
  try {
    // Count requests this month for PAT 1
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('api_tracking')
      .select('id', { count: 'exact' })
      .eq('service', 'clarifai')
      .gte('created_at', startOfMonth.toISOString());
    
    const requestCount = data?.length || 0;
    
    // Switch to account 2 if over limit
    if (requestCount >= REQUESTS_PER_ACCOUNT) {
      console.log(`🔄 Using PAT #2 (${requestCount} requests this month)`);
      return CLARIFAI_PATS[1];
    } else {
      console.log(`✅ Using PAT #1 (${requestCount}/950 requests)`);
      return CLARIFAI_PATS[0];
    }
  } catch (err) {
    console.error('Error checking PAT usage:', err);
    return CLARIFAI_PATS[0]; // Default to first
  }
};
export async function analyzePhoto(imageBase64) {
  try {
    console.log('📤 Sending photo to Clarifai for analysis...');

    const currentPAT = await getCurrentPAT(); 
    
    const response = await fetch(CLARIFAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${currentPAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_app_id: {
          user_id: "clarifai",
          app_id: "main"
        },
        inputs: [
          {
            data: {
              image: {
                base64: imageBase64
              }
            }
          }
        ]
      })
    });

    const data = await response.json();
    
    // Check for API errors
    if (!response.ok) {
      console.error('❌ Clarifai API error:', data);
      
      if (response.status === 401) {
        throw new Error('Clarifai authentication failed. Please check your Personal Access Token.');
      }
      
      throw new Error(`Clarifai API error: ${data.status?.description || 'Unknown error'}`);
    }

    // Check if we got results
    if (!data.outputs || !data.outputs[0] || !data.outputs[0].data || !data.outputs[0].data.concepts) {
      console.error('❌ Unexpected Clarifai response structure:', data);
      throw new Error('No food detected in image');
    }

    const concepts = data.outputs[0].data.concepts;
    
    // Get the top detected food item
    const topConcept = concepts[0];
    
    if (!topConcept) {
      throw new Error('No food detected in image');
    }

    const foodName = topConcept.name;
    const confidence = Math.round(topConcept.value * 100); // Convert 0-1 to 0-100

    console.log(`✅ Clarifai detected: ${foodName} (${confidence}% confidence)`);
    console.log(`📊 Top 3 results:`, concepts.slice(0, 3).map(c => `${c.name} (${Math.round(c.value * 100)}%)`));

    return {
      foodName,
      confidence,
      allConcepts: concepts.slice(0, 5).map(c => ({
        name: c.name,
        confidence: Math.round(c.value * 100)
      }))
    };

  } catch (error) {
    console.error('❌ Error analyzing photo:', error);
    throw error;
  }
}

/**
 * Log API usage to Supabase for tracking
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} type - 'photo_recognition'
 * @param {boolean} success - Whether the call succeeded
 * @param {Object} metadata - Additional data to log
 */
export async function logClarifaiUsage(supabase, userId, type, success, metadata = {}) {
  try {
    await supabase.from('api_calls').insert({
      user_id: userId,
      service: 'clarifai',
      type: type,
      success: success,
      metadata: metadata,
      cost_estimate: 0.0012 // $0.0012 per request after free tier
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
    // Don't throw - logging failure shouldn't break the app
  }
}

/**
 * Convert image URI to base64
 * @param {string} uri - Image URI from camera/file system
 * @returns {Promise<string>} - Base64 string (without data:image prefix)
 */
export async function imageUriToBase64(uri) {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the data:image/jpeg;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }
}

export default {
  analyzePhoto,
  imageUriToBase64,
  logClarifaiUsage
};