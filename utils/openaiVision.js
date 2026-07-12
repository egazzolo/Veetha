import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';

const LANGUAGE_NAMES = { en: 'English', es: 'Spanish', fr: 'French', tl: 'Filipino (Tagalog)', pt: 'Portuguese' };

export async function analyzePhotoOpenAI(photoUri, language = 'en') {
  try {
    console.log('📤 Sending photo to GPT-4o Vision (via openai-proxy)...');

    // Resize image to reduce payload size
    const manipulated = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 768 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    const base64 = manipulated.base64;

    const { data, error: invokeError } = await supabase.functions.invoke('openai-proxy', {
      body: {
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                  detail: 'low'
                }
              },
              {
                type: 'text',
                // NEW
                text: `Look carefully at the actual colors, textures, and appearance of the food in this image before identifying it. A dark brown food is NOT angel food cake (which is white). Be accurate based on what you actually see.

Respond with all food_name and whole_meal_name values in ${LANGUAGE_NAMES[language] || 'English'}.

Identify all foods in this image, including how many discrete units of each food are visible (e.g. 3 chicken nuggets, 2 pancakes). Return ONLY a JSON object with no markdown or backticks:
{
  "foods": [
    {
      "food_name": "specific food name",
      "item_count": number (how many discrete countable units are visible, default 1 if not countable),
      "calories_per_100g": number,
      "protein_per_100g": number,
      "carbs_per_100g": number,
      "fat_per_100g": number,
      "sugar_per_100g": number (grams),
      "fiber_per_100g": number (grams),
      "sodium_per_100g": number (grams),
      "typical_serving_grams": number (weight of ONE unit, not the total),
      "confidence": number between 0 and 100
    }
  ],
  "whole_meal_name": "descriptive name for the whole meal e.g. mixed vegetables"
}
Be specific based on visual appearance — dark brown baked goods are chocolate cake or brownies, not angel food cake. If no food detected return {"error": "no food detected"}.`
              }
            ]
          }
        ]
      }
    });

    if (invokeError) {
      throw new Error(invokeError.message || 'OpenAI proxy invoke failed');
    }

    console.log('✅ GPT-4o response:', JSON.stringify(data).slice(0, 800));

    if (data?.error) {
      throw new Error(data.error?.message || data.error || 'OpenAI API error');
    }

    const content = data.choices[0]?.message?.content;
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error) throw new Error(parsed.error);

    const foods = parsed.foods || [];
    if (foods.length === 0) throw new Error('No food detected');

    const primary = foods[0];
    const pluralize = (name, count) => {
      if (count <= 1) return name;
      if (/s$/i.test(name)) return name;
      return `${name}s`;
    };
    // Bake item_count into typical_serving_grams so downstream consumers (ResultScreen, MealsList)
    // don't need to know about item_count — typical_serving_grams becomes the TOTAL grams for that food line.
    const processedFoods = foods.map(f => ({
      ...f,
      typical_serving_grams: (f.typical_serving_grams || 100) * (f.item_count || 1),
    }));
    // Calculate total meal macros by summing each food's actual contribution (per 100g × serving / 100)
    const totalCalories = processedFoods.reduce((sum, f) => sum + ((f.calories_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalProtein = processedFoods.reduce((sum, f) => sum + ((f.protein_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalCarbs = processedFoods.reduce((sum, f) => sum + ((f.carbs_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalFat = processedFoods.reduce((sum, f) => sum + ((f.fat_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalSugar = processedFoods.reduce((sum, f) => sum + ((f.sugar_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalFiber = processedFoods.reduce((sum, f) => sum + ((f.fiber_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalSodium = processedFoods.reduce((sum, f) => sum + ((f.sodium_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalServingGrams = processedFoods.reduce((sum, f) => sum + (f.typical_serving_grams || 100), 0);
    
    // Normalize back to per-100g so the rest of the app's serving-size math still works
    const ratio = totalServingGrams > 0 ? 100 / totalServingGrams : 1;
    
    return {
      foodName: processedFoods.length === 1
        ? (processedFoods[0].item_count > 1
            ? `(${processedFoods[0].item_count}) ${processedFoods[0].food_name}`
            : processedFoods[0].food_name)
        : (parsed.whole_meal_name || primary.food_name),
      confidence: primary.confidence,
      calories: totalCalories * ratio,
      protein: totalProtein * ratio,
      carbs: totalCarbs * ratio,
      fat: totalFat * ratio,
      sugar: totalSugar * ratio,
      fiber: totalFiber * ratio,
      sodium: totalSodium * ratio,
      typicalServing: processedFoods.length === 1 ? (processedFoods[0].typical_serving_grams || 100) : totalServingGrams,
      individualFoods: processedFoods,
      topSuggestions: processedFoods.map(f => ({ name: f.food_name, confidence: f.confidence })),
      allConcepts: processedFoods.map(f => ({ name: f.food_name, confidence: f.confidence })),
      source: 'openai',
    };

  } catch (error) {
    console.error('❌ OpenAI Vision error:', error);
    throw error;
  }
}