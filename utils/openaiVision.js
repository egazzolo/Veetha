import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';

export async function analyzePhotoOpenAI(photoUri) {
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
                text: `Look carefully at the actual colors, textures, and appearance of the food in this image before identifying it. A dark brown food is NOT angel food cake (which is white). Be accurate based on what you actually see.

Identify all foods in this image. Return ONLY a JSON object with no markdown or backticks:
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
    return {
      foodName: foods.length === 1 ? primary.food_name : (parsed.whole_meal_name || primary.food_name),
      confidence: primary.confidence,
      calories: foods.reduce((sum, f) => sum + (f.calories_per_100g || 0), 0) / foods.length,
      protein: foods.reduce((sum, f) => sum + (f.protein_per_100g || 0), 0) / foods.length,
      carbs: foods.reduce((sum, f) => sum + (f.carbs_per_100g || 0), 0) / foods.length,
      fat: foods.reduce((sum, f) => sum + (f.fat_per_100g || 0), 0) / foods.length,
      typicalServing: primary.typical_serving_grams || 100,
      individualFoods: foods,
      topSuggestions: foods.map(f => ({ name: f.food_name, confidence: f.confidence })),
      allConcepts: foods.map(f => ({ name: f.food_name, confidence: f.confidence })),
      source: 'openai',
    };

  } catch (error) {
    console.error('❌ OpenAI Vision error:', error);
    throw error;
  }
}