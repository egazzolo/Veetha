// Food Database Utilities
// Functions for searching, saving, and learning from user food entries

import { supabase } from './supabase';
import { getBestUSDAMatch, searchFoodVariants } from './usdaApi';

/**
 * Search for food in our local database first, then USDA if not found
 * @param {string} foodName - Name of food to search for
 * @returns {Promise<Object|null>} - Food data with nutrition
 */
export async function searchFood(foodName) {
  try {
    console.log('🔍 Searching for food:', foodName);
    
    // Step 1: Search our local database first
    const localFood = await searchLocalFoodDatabase(foodName);
    if (localFood) {
      console.log('✅ Found in local database:', localFood.name);
      return {
        ...localFood,
        source: 'local',
      };
    }

    // Step 2: Search USDA if not in local database
    console.log('🌐 Not in local DB, searching USDA...');
    const usdaFood = await searchFoodVariants(foodName);
    
    if (usdaFood) {
      console.log('✅ Found in USDA:', usdaFood.name);
      
      // Save to local database for next time
      await saveFoodToDatabase(usdaFood, foodName);
      
      return usdaFood;
    }

    console.log('❌ Food not found in local DB or USDA');
    return null;
  } catch (error) {
    console.error('❌ Error searching for food:', error);
    return null;
  }
}

/**
 * Search local food database
 * @param {string} foodName - Name to search for
 * @returns {Promise<Object|null>} - Food data or null
 */
async function searchLocalFoodDatabase(foodName) {
  try {
    const normalized = foodName.toLowerCase().trim();
    
    // Search with fuzzy matching
    const { data, error } = await supabase
      .from('food_database')
      .select('*')
      .ilike('name_normalized', `%${normalized}%`)
      .order('times_used', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const food = data[0];
      return {
        id: food.id,
        name: food.name,
        product_name: food.name,
        fdcId: food.usda_fdc_id,
        nutriments: {
          'energy-kcal_100g': food.calories,
          'energy-kcal': food.calories,
          proteins_100g: food.protein,
          proteins: food.protein,
          carbohydrates_100g: food.carbs,
          carbohydrates: food.carbs,
          fat_100g: food.fat,
          fat: food.fat,
          sodium_100g: food.sodium || 0,
          sodium: food.sodium || 0,
          sugars_100g: food.sugar || 0,
          sugar: food.sugar || 0,
          fiber_100g: food.fiber || 0,
          fiber: food.fiber || 0,
        },
        source: food.source,
        timesUsed: food.times_used,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error searching local database:', error);
    return null;
  }
}

/**
 * Save food to local database
 * @param {Object} foodData - Food nutrition data
 * @param {string} detectedName - Name detected by AI
 * @returns {Promise<boolean>} - Success status
 */
export async function saveFoodToDatabase(foodData, detectedName = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const normalized = foodData.name.toLowerCase().trim();
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('food_database')
      .select('id, times_used')
      .eq('name_normalized', normalized)
      .single();

    if (existing) {
      // Update times_used
      await supabase
        .from('food_database')
        .update({
          times_used: existing.times_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      console.log('✅ Updated existing food in database');
      return true;
    }

    // Insert new food
    const { error } = await supabase
      .from('food_database')
      .insert({
        name: foodData.name,
        name_normalized: normalized,
        detected_by_ai: detectedName !== null,
        source: foodData.source || 'usda',
        usda_fdc_id: foodData.fdcId?.toString() || null,
        calories: foodData.nutrients['energy-kcal'] || 0,
        protein: foodData.nutrients.proteins || 0,
        carbs: foodData.nutrients.carbohydrates || 0,
        fat: foodData.nutrients.fat || 0,
        sodium: foodData.nutrients.sodium || 0,
        sugar: foodData.nutrients.sugar || 0,
        fiber: foodData.nutrients.fiber || 0,
        added_by_user_id: user?.id || null,
        times_used: 1,
      });

    if (error) throw error;

    console.log('✅ Saved new food to database');
    return true;
  } catch (error) {
    console.error('❌ Error saving food to database:', error);
    return false;
  }
}

/**
 * Learn from user corrections
 * When user changes AI-detected food name, save this mapping
 * @param {string} aiDetectedName - What AI detected
 * @param {string} userCorrectedName - What user corrected it to
 * @param {Object} nutritionData - The nutrition data user confirmed
 */
export async function learnFromCorrection(aiDetectedName, userCorrectedName, nutritionData) {
  try {
    console.log(`📚 Learning: "${aiDetectedName}" → "${userCorrectedName}"`);
    
    // Save the corrected name with better metadata
    await saveFoodToDatabase({
      name: userCorrectedName,
      nutrients: nutritionData,
      source: 'user_correction',
      fdcId: null,
    }, aiDetectedName);

    // You could also save the mapping in a separate table for future AI improvements
    // For now, just increment the usage of the corrected name
    
    console.log('✅ Learned from correction');
  } catch (error) {
    console.error('❌ Error learning from correction:', error);
  }
}

/**
 * Get popular foods (most frequently logged)
 * Useful for quick-add suggestions
 * @param {number} limit - Number of foods to return
 * @returns {Promise<Array>} - Array of popular foods
 */
export async function getPopularFoods(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('food_database')
      .select('*')
      .order('times_used', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(food => ({
      id: food.id,
      name: food.name,
      nutrients: {
        'energy-kcal': food.calories,
        proteins: food.protein,
        carbohydrates: food.carbs,
        fat: food.fat,
      },
      timesUsed: food.times_used,
    }));
  } catch (error) {
    console.error('❌ Error getting popular foods:', error);
    return [];
  }
}

/**
 * Verify if nutrition data is reasonable
 * Helps prevent bad data from being saved
 * @param {Object} nutrients - Nutrition data to verify
 * @returns {boolean} - True if data seems reasonable
 */
export function verifyNutritionData(nutrients) {
  const calories = nutrients['energy-kcal'] || 0;
  const protein = nutrients.proteins || 0;
  const carbs = nutrients.carbohydrates || 0;
  const fat = nutrients.fat || 0;

  // Basic sanity checks
  if (calories < 0 || calories > 900) return false; // Per 100g
  if (protein < 0 || protein > 100) return false;
  if (carbs < 0 || carbs > 100) return false;
  if (fat < 0 || fat > 100) return false;
  
  // Check if macros roughly match calories (allowing for fiber, alcohol, etc.)
  const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
  const difference = Math.abs(calories - calculatedCalories);
  
  // Allow 30% difference (fiber, alcohol, rounding)
  if (difference > calories * 0.3 && calories > 50) {
    console.warn('⚠️ Nutrition data may be inaccurate - macro/calorie mismatch');
    return false;
  }

  return true;
}