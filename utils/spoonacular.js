import { supabase } from './supabase';

const SPOONACULAR_API_KEY = 'a6eaa56cc88c40529476a16706a93027';
const BASE_URL = 'https://api.spoonacular.com/recipes';

// Fetch recipes from Spoonacular API
export const searchRecipes = async (filters = {}) => {
  const {
    diet,
    intolerances,
    maxCalories,
    minProtein,
    type, // breakfast, lunch, dinner
    number = 10,
  } = filters;

  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number,
    addRecipeNutrition: true,
    ...(diet && { diet }),
    ...(intolerances && { intolerances }),
    ...(maxCalories && { maxCalories }),
    ...(minProtein && { minProtein }),
    ...(type && { type }),
  });

  try {
    const response = await fetch(`${BASE_URL}/complexSearch?${params}`);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Spoonacular API error:', error);
    return [];
  }
};

// Get detailed recipe info
export const getRecipeDetails = async (recipeId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/${recipeId}/information?apiKey=${SPOONACULAR_API_KEY}&includeNutrition=true`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    return null;
  }
};

// Save recipe to YOUR Supabase database
export const saveRecipeToDatabase = async (recipe) => {
  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('recipes')
      .select('id')
      .eq('spoonacular_id', recipe.id)
      .single();

    if (existing) {
      console.log('Recipe already in database');
      return { data: existing, error: null };
    }

    // Insert new recipe
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        spoonacular_id: recipe.id,
        title: recipe.title,
        image_url: recipe.image,
        ready_in_minutes: recipe.readyInMinutes,
        servings: recipe.servings,
        calories: recipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 0,
        protein: recipe.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount || 0,
        carbs: recipe.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 0,
        fat: recipe.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount || 0,
        ingredients: recipe.extendedIngredients || [],
        instructions: recipe.instructions,
        diet_types: recipe.diets || [],
        cuisines: recipe.cuisines || [],
        dish_types: recipe.dishTypes || [],
      })
      .select()
      .single();

    if (!error) {
      console.log('✅ Recipe saved:', recipe.title);
    }

    return { data, error };
  } catch (err) {
    console.error('Error saving recipe:', err);
    return { error: err };
  }
};

// Fetch recipes from YOUR database (not Spoonacular)
export const getRecipesFromDatabase = async (filters = {}) => {
  try {
    let query = supabase.from('recipes').select('*');

    // Apply filters
    if (filters.dishType) {
      query = query.contains('dish_types', [filters.dishType]);
    }
    if (filters.maxCalories) {
      query = query.lte('calories', filters.maxCalories);
    }
    if (filters.minProtein) {
      query = query.gte('protein', filters.minProtein);
    }

    const { data, error } = await query.limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching from database:', error);
    return [];
  }
};