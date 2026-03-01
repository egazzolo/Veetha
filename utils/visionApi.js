// ============================================
// GOOGLE CLOUD VISION API INTEGRATION
// Food Recognition using Google Cloud Vision
// ============================================

import { supabase } from './supabase';

const GOOGLE_VISION_API_KEY = 'AIzaSyCCW9sihgyJGcQdqENbX2viFRKIqBFDP2U'

const GOOGLE_VISION_URL = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`;

/**
 * Analyze a photo using Google Cloud Vision
 * @param {string} imageBase64 - Base64 encoded image data (without data:image prefix)
 * @returns {Promise<Object>} - { foodName, confidence } or throws error
 */
export async function analyzePhoto(imageBase64) {
  try {
    console.log('📤 Sending photo to Google Vision for analysis...');

    const response = await fetch(GOOGLE_VISION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64
            },
            features: [
              {
                type: 'LABEL_DETECTION',
                maxResults: 10
              },
              {
                type: 'WEB_DETECTION',
                maxResults: 5
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    // Check for API errors
    if (!response.ok || data.responses?.[0]?.error) {
      console.error('❌ Google Vision API error:', data);
      
      const errorMsg = data.responses?.[0]?.error?.message || data.error?.message;
      
      if (response.status === 403) {
        throw new Error('Google Vision API key invalid or quota exceeded');
      }
      
      throw new Error(`Google Vision API error: ${errorMsg || 'Unknown error'}`);
    }

    const result = data.responses[0];
    
    // Get labels (food detection)
    const labels = result.labelAnnotations || [];
    
    // Get web entities (better food names)
    const webEntities = result.webDetection?.webEntities || [];

    if (labels.length === 0 && webEntities.length === 0) {
      throw new Error('No food detected in image');
    }

    // Combine and rank results
    const allDetections = [
      ...webEntities.map(e => ({
        name: e.description,
        confidence: Math.round((e.score || 0.5) * 100),
        source: 'web'
      })),
      ...labels.map(l => ({
        name: l.description,
        confidence: Math.round(l.score * 100),
        source: 'label'
      }))
    ];

    // Filter food-related terms
    const foodKeywords = [
      'food', 'dish', 'meal', 'cuisine', 'recipe', 'ingredient',
      'vegetable', 'fruit', 'meat', 'seafood', 'dessert', 'snack',
      'breakfast', 'lunch', 'dinner', 'drink', 'beverage'
    ];

    const foodDetections = allDetections.filter(d => {
      const nameLower = d.name.toLowerCase();
      return (
        foodKeywords.some(keyword => nameLower.includes(keyword)) ||
        d.source === 'web' // Web entities are usually more specific
      );
    });

    // Sort by confidence
    foodDetections.sort((a, b) => b.confidence - a.confidence);

    if (foodDetections.length === 0) {
      throw new Error('No food detected in image');
    }

    const topDetection = foodDetections[0];

    console.log(`✅ Google Vision detected: ${topDetection.name} (${topDetection.confidence}% confidence)`);
    console.log(`📊 Top 3 results:`, foodDetections.slice(0, 3).map(d => `${d.name} (${d.confidence}%)`));

    return {
      foodName: topDetection.name,
      confidence: topDetection.confidence,
      allConcepts: foodDetections.slice(0, 5).map(d => ({
        name: d.name,
        confidence: d.confidence
      }))
    };

  } catch (error) {
    console.error('❌ Error analyzing photo:', error);
    throw error;
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
  imageUriToBase64
};