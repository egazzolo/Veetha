import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';

export async function analyzePhotoGemini(photoUri, model = 'gemini-2.5-flash-lite') {
  try {
    console.log('📤 Sending photo to Gemini Vision (via gemini-proxy)...');

    // Resize image to reduce payload size (full-size photos crash the Edge Function)
    const manipulated = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 768 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    const base64 = manipulated.base64;

    const prompt = `Look carefully at the actual colors, textures, and appearance of the food in this image before identifying it. A dark brown food is NOT angel food cake (which is white). Be accurate based on what you actually see.

Identify all foods in this image. Return ONLY a JSON object:
{
  "foods": [
    {
      "food_name": "specific food name",
      "calories_per_100g": number,
      "protein_per_100g": number,
      "carbs_per_100g": number,
      "fat_per_100g": number,
      "typical_serving_grams": number,
      "confidence": number between 0 and 100
    }
  ],
  "whole_meal_name": "descriptive name for the whole meal e.g. mixed vegetables"
}
Be specific based on visual appearance — dark brown baked goods are chocolate cake or brownies, not angel food cake. If no food detected return {"error": "no food detected"}.`;

    const { data, error: invokeError } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        model,
        prompt,
        imageBase64: base64,
        max_tokens: 800,
      },
    });

    if (invokeError) {
      throw new Error(invokeError.message || 'Gemini proxy invoke failed');
    }

    console.log('✅ Gemini response:', JSON.stringify(data).slice(0, 800));

    if (data?.error) {
      throw new Error(data.error?.message || data.error || 'Gemini API error');
    }

    // Gemini response shape: candidates[0].content.parts[0].text
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Gemini returned no content');
    }

    // responseMimeType: application/json should give clean JSON, but strip just in case
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error) throw new Error(parsed.error);

    const foods = parsed.foods || [];
    if (foods.length === 0) throw new Error('No food detected');

    const primary = foods[0];
    // Calculate total meal macros by summing each food's actual contribution (per 100g × serving / 100)
    const totalCalories = foods.reduce((sum, f) => sum + ((f.calories_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalProtein = foods.reduce((sum, f) => sum + ((f.protein_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalCarbs = foods.reduce((sum, f) => sum + ((f.carbs_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalFat = foods.reduce((sum, f) => sum + ((f.fat_per_100g || 0) * (f.typical_serving_grams || 100) / 100), 0);
    const totalServingGrams = foods.reduce((sum, f) => sum + (f.typical_serving_grams || 100), 0);
    
    // Normalize back to per-100g so the rest of the app's serving-size math still works
    const ratio = totalServingGrams > 0 ? 100 / totalServingGrams : 1;
    
    return {
      foodName: foods.length === 1 ? primary.food_name : (parsed.whole_meal_name || primary.food_name),
      confidence: primary.confidence,
      calories: totalCalories * ratio,
      protein: totalProtein * ratio,
      carbs: totalCarbs * ratio,
      fat: totalFat * ratio,
      typicalServing: foods.length === 1 ? (primary.typical_serving_grams || 100) : totalServingGrams,
      individualFoods: foods,
      topSuggestions: foods.map(f => ({ name: f.food_name, confidence: f.confidence })),
      allConcepts: foods.map(f => ({ name: f.food_name, confidence: f.confidence })),
      source: 'gemini',
    };

  } catch (error) {
    console.error('❌ Gemini Vision error:', error);
    throw error;
  }
}