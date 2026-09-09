import { supabase } from './supabase';

// Free users can pin up to this many frequent meals; premium is unlimited.
export const FREE_FREQUENT_MEALS_LIMIT = 5;

export async function getFrequentMeals(userId) {
  const { data, error } = await supabase
    .from('frequent_meals')
    .select(`
      *,
      product:food_database!frequent_meals_product_id_fkey (
        name, calories, protein, carbs, fat, serving_unit, image_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Returns { success: true } or { success: false, reason: 'cap' | error }.
export async function addFrequentMeal(userId, meal, isPremium) {
  if (!isPremium) {
    const { count, error: countError } = await supabase
      .from('frequent_meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (countError) return { success: false, reason: countError };
    if ((count || 0) >= FREE_FREQUENT_MEALS_LIMIT) {
      return { success: false, reason: 'cap' };
    }
  }

  const { error } = await supabase.from('frequent_meals').insert({
    user_id: userId,
    product_id: meal.product_id || null,
    barcode: meal.barcode || null,
    serving_grams: meal.serving_grams,
    serving_unit: meal.serving_unit,
    meal_type: meal.meal_type,
    image_url: meal.image_url,
    individual_foods: meal.individual_foods || null,
  });
  if (error) return { success: false, reason: error };
  return { success: true };
}

export async function removeFrequentMeal(id) {
  const { error } = await supabase.from('frequent_meals').delete().eq('id', id);
  if (error) throw error;
}

// Re-logs a saved frequent meal as a new entry for right now, mirroring the
// same field set HomeScreen's "Copy Yesterday" duplicates.
export async function logFrequentMealNow(userId, frequentMeal) {
  const { error } = await supabase.from('meals').insert({
    user_id: userId,
    product_id: frequentMeal.product_id,
    barcode: frequentMeal.barcode,
    serving_grams: frequentMeal.serving_grams,
    serving_unit: frequentMeal.serving_unit,
    meal_type: frequentMeal.meal_type,
    image_url: frequentMeal.image_url,
    individual_foods: frequentMeal.individual_foods,
    logged_at: new Date().toISOString(),
  });
  if (error) throw error;
}
