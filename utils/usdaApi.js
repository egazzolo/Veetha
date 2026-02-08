// USDA FoodData Central API Integration
// API Documentation: https://fdc.nal.usda.gov/api-guide.html

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

// ⚠️ IMPORTANT: USDA now requires API key (even DEMO_KEY works)
// Get FREE key at: https://fdc.nal.usda.gov/api-key-signup.html
// Takes 2 minutes - just enter your email!
const USDA_API_KEY = 'xxf8tDI78gYGFPkmn6ORw5KNQ0gzgfbH9ar7X3aB'; // 30 requests/hour

/**
 * Search for food in USDA database
 * @param {string} query - Food name to search for
 * @param {number} pageSize - Number of results to return (default: 5)
 * @returns {Promise<Array>} - Array of food items with nutrition data
 */
export async function searchUSDAFood(query, pageSize = 5) {
  const q = query?.trim();
  if (!q) {
    console.log('⚠️ Skipping USDA search: empty query');
    return [];
  }

  try {
    console.log('🔍 Searching USDA for:', query);
    
    if (!USDA_API_KEY || USDA_API_KEY === 'YOUR_API_KEY_HERE') {
      console.error('❌ USDA API key not configured!');
      throw new Error('USDA API key required. Get free key at https://fdc.nal.usda.gov/api-key-signup.html');
    }
    
    // Build API URL with API key
    const params = new URLSearchParams({
      query: q,
      pageSize: pageSize.toString(),
      dataType: 'Survey (FNDDS)', // Prioritize survey foods (most complete data)
      api_key: USDA_API_KEY, // ✅ NOW REQUIRED
    });

    const response = await fetch(`${USDA_API_BASE}/foods/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('USDA API access denied. Please get a free API key from https://fdc.nal.usda.gov/api-key-signup.html');
      }
      if (response.status === 429) {
        throw new Error('USDA API rate limit exceeded. Please wait or get your own API key.');
      }
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      console.log('❌ No foods found in USDA for:', query);
      return [];
    }

    console.log(`✅ Found ${data.foods.length} foods in USDA`);

    // Parse and normalize the results
    const foods = data.foods.map(food => parseUSDAFood(food));
    
    return foods;
  } catch (error) {
    console.error('❌ USDA API error:', error);
    return [];
  }
}

/**
 * Parse USDA food data into our app's format
 * @param {Object} usdaFood - Raw USDA food object
 * @returns {Object} - Normalized food object
 */
function parseUSDAFood(usdaFood) {
  // Extract nutrients (per 100g)
  const nutrients = {};
  
  if (usdaFood.foodNutrients) {
    usdaFood.foodNutrients.forEach(nutrient => {
      const name = nutrient.nutrientName.toLowerCase();
      const value = nutrient.value || 0;
      
      // Map USDA nutrient names to our format
      if (name.includes('energy')) {
        nutrients.calories = Math.round(value);
      } else if (name.includes('protein')) {
        nutrients.protein = Math.round(value * 10) / 10;
      } else if (name.includes('carbohydrate')) {
        nutrients.carbs = Math.round(value * 10) / 10;
      } else if (name.includes('total lipid') || name.includes('fat, total')) {
        nutrients.fat = Math.round(value * 10) / 10;
      } else if (name.includes('sodium')) {
        nutrients.sodium = Math.round(value);
      } else if (name.includes('sugars, total')) {
        nutrients.sugar = Math.round(value * 10) / 10;
      } else if (name.includes('fiber')) {
        nutrients.fiber = Math.round(value * 10) / 10;
      }
    });
  }

  return {
    fdcId: usdaFood.fdcId,
    name: usdaFood.description,
    brand: usdaFood.brandOwner || null,
    dataType: usdaFood.dataType,
    nutrients: {
      'energy-kcal_100g': nutrients.calories || 0,
      'energy-kcal': nutrients.calories || 0,
      proteins_100g: nutrients.protein || 0,
      proteins: nutrients.protein || 0,
      carbohydrates_100g: nutrients.carbs || 0,
      carbohydrates: nutrients.carbs || 0,
      fat_100g: nutrients.fat || 0,
      fat: nutrients.fat || 0,
      sodium_100g: nutrients.sodium || 0,
      sodium: nutrients.sodium || 0,
      sugars_100g: nutrients.sugar || 0,
      sugar: nutrients.sugar || 0,
      fiber_100g: nutrients.fiber || 0,
      fiber: nutrients.fiber || 0,
    },
    source: 'usda',
  };
}

/**
 * Get the best matching food from USDA results
 * Prioritizes foods with complete nutrition data
 * @param {string} query - Original search query
 * @returns {Promise<Object|null>} - Best matching food or null
 */
export async function getBestUSDAMatch(query) {
  try {
    const results = await searchUSDAFood(query, 10);
    
    if (results.length === 0) {
      return null;
    }

    // Score each result
    const scoredResults = results.map(food => {
      let score = 0;
      
      // REQUIRE at least calories - skip foods with no nutrition data
      const nutrients = food.nutrients;
      if (nutrients['energy-kcal'] === 0) {
        return { ...food, score: -1000 }; // Heavily penalize zero-calorie results
      }
      
      // Prefer foods with complete nutrition data
      if (nutrients['energy-kcal'] > 0) score += 10;
      if (nutrients.proteins > 0) score += 5;
      if (nutrients.carbohydrates > 0) score += 5;
      if (nutrients.fat > 0) score += 5;
      
      // Prefer survey foods (most accurate)
      if (food.dataType === 'Survey (FNDDS)') score += 20;
      
      // Prefer branded foods for specific items
      if (food.brand) score += 5;
      
      // Fuzzy match with query - EXACT matches get huge boost
      const nameLower = food.name.toLowerCase();
      const queryLower = query.toLowerCase();

      // Penalize "fried", "cooked", "breaded", "coated"
      if (nameLower.includes('fried')) score -= 50;
      if (nameLower.includes('breaded')) score -= 50;
      if (nameLower.includes('coated')) score -= 50;
      if (nameLower.includes('baked')) score -= 30;

      // Boost raw items if searching for raw
      if (queryLower.includes('raw') && nameLower.includes('raw')) score += 30;

      // Boost skinless if searching for skinless
      if (queryLower.includes('skinless') && nameLower.includes('skinless')) score += 30;

      // General fuzzy match
      if (nameLower.includes(queryLower)) score += 15;

      console.log(`   - ${food.name} (score: ${score})`);
      
      return { ...food, score };
    });

    // Remove foods with no nutrition data
    const validResults = scoredResults.filter(food => food.score > 0);

    if (validResults.length === 0) {
      console.log('❌ No valid nutrition data found');
      return null;
    }

    // Sort by score (highest first)
    validResults.sort((a, b) => b.score - a.score);

    console.log('🏆 Best match:', validResults[0].name, '(score:', validResults[0].score + ')');

    return validResults[0];

    // Sort by score (highest first)
    scoredResults.sort((a, b) => b.score - a.score);
    
    console.log('🏆 Best match:', scoredResults[0].name, '(score:', scoredResults[0].score + ')');
    
    return scoredResults[0];
  } catch (error) {
    console.error('❌ Error getting best USDA match:', error);
    return null;
  }
}

/**
 * Search multiple variants of a food name
 * Useful when AI detection might be slightly off
 * @param {string} query - Original query
 * @returns {Promise<Object|null>} - Best matching food
 */
export async function searchFoodVariants(query) {
  // Generate variants
  const variants = [
    query,
    query + ' raw',
    query + ' cooked',
    query.replace('s', ''), // singular
  ];

  console.log('🔄 Trying variants:', variants);

  for (const variant of variants) {
    const result = await getBestUSDAMatch(variant);
    if (result && result.nutrients['energy-kcal'] > 0) {
      return result;
    }
  }

  return null;
}