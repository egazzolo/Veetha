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
                maxResults: 20
              },
              {
                type: 'WEB_DETECTION',
                maxResults: 5
              },
              {
                type: 'OBJECT_LOCALIZATION',
                maxResults: 10
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

    // Log raw results for debugging
    console.log('🔍 Raw label annotations (top 5):', labels.slice(0, 5).map(l =>
      `${l.description} (${Math.round(l.score * 100)}%)`
    ));
    console.log('🔍 Raw web entities (top 5):', webEntities.slice(0, 5).map(e =>
      `${e.description || '(no description)'} (score: ${e.score ?? 'none'})`
    ));

    // Filter out web entities with no score or low confidence (< 0.7)
    const filteredWebEntities = webEntities.filter(e =>
      e.description && e.score != null && e.score >= 0.7
    );

    // Build detections — labels first so they take priority at equal confidence
    const localizedObjects = result.localizedObjectAnnotations || [];

    const allDetections = [
      ...labels.map(l => ({
        name: l.description,
        confidence: Math.round(l.score * 100),
        source: 'label'
      })),
      ...filteredWebEntities.map(e => ({
        name: e.description,
        confidence: Math.round(e.score * 100),
        source: 'web'
      })),
      ...localizedObjects.map(o => ({
        name: o.name,
        confidence: Math.round(o.score * 100),
        source: 'object'
      }))
    ];

    // Food-related keywords for filtering
    const foodKeywords = [
      'food', 'dish', 'meal', 'cuisine', 'recipe', 'ingredient',
      'vegetable', 'fruit', 'meat', 'seafood', 'dessert', 'snack',
      'breakfast', 'lunch', 'dinner', 'drink', 'beverage',
      'produce', 'dairy', 'grain', 'bread', 'pasta', 'rice',
      'soup', 'salad', 'sauce', 'cheese', 'egg', 'nut', 'bean',
      'herb', 'spice', 'baked', 'roast', 'fried', 'grilled'
    ];

    // Non-food terms that should be excluded even if they pass the filter
    const excludeKeywords = [
      'tableware', 'plate', 'bowl', 'cutlery', 'kitchen',
      'photography', 'recipe', 'cooking', 'restaurant',
      'garnish', 'table', 'serveware', 'dishware'
    ];

    const foodDetections = allDetections.filter(d => {
      const nameLower = d.name.toLowerCase();

      // Exclude generic non-food terms
      if (excludeKeywords.some(kw => nameLower.includes(kw))) {
        return false;
      }

      // For labels: keep if food-related keyword matches OR if confidence is high
      // (Vision API labels for food images are usually food items)
      if (d.source === 'label') {
        return foodKeywords.some(kw => nameLower.includes(kw)) || d.confidence >= 80;
      }

      // For web entities: only keep if they match a food keyword
      return foodKeywords.some(kw => nameLower.includes(kw));
    });

    // Sort by confidence, with labels winning ties over web entities
    const genericLabels = ['food', 'fruit', 'produce', 'ingredient', 'natural foods', 'superfood', 'dish', 'meal', 'seedless fruit', 'natural food'];

    foodDetections.sort((a, b) => {
      const aIsGeneric = genericLabels.some(g => a.name.toLowerCase() === g);
      const bIsGeneric = genericLabels.some(g => b.name.toLowerCase() === g);
      if (aIsGeneric && !bIsGeneric) return 1;
      if (!aIsGeneric && bIsGeneric) return -1;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.source === 'label' ? -1 : 1;
    });

    // Apply minimum confidence threshold of 50%
    const MIN_CONFIDENCE = 50;
    const confidentDetections = foodDetections.filter(d => d.confidence >= MIN_CONFIDENCE);

    if (confidentDetections.length === 0) {
      throw new Error('No food detected in image');
    }

    const topDetections = confidentDetections.slice(0, 3);

    console.log(`✅ Google Vision detected: ${topDetections[0].name} (${topDetections[0].confidence}% confidence)`);
    console.log(`📊 Top 3 results:`, topDetections.map(d => `${d.name} (${d.confidence}%, ${d.source})`));

    return {
      foodName: topDetections[0].name,
      confidence: topDetections[0].confidence,
      topSuggestions: topDetections.map(d => ({
        name: d.name,
        confidence: d.confidence
      })),
      allConcepts: confidentDetections.slice(0, 5).map(d => ({
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