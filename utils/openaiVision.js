import { OPENAI_API_KEY } from '@env';

export async function analyzePhotoOpenAI(photoUri) {
  try {
    console.log('📤 Sending photo to GPT-4o Vision...');

    // Convert image to base64
    const response = await fetch(photoUri);
    const blob = await response.blob();
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
                text: `Identify all foods in this image. Return ONLY a JSON object with no markdown or backticks:
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
Be specific — say broccoli not vegetable, tangerine not citrus. If no food detected return {"error": "no food detected"}.`
              }
            ]
          }
        ]
      })
    });

    const data = await apiResponse.json();
    clearTimeout(timeoutId);
    console.log('✅ GPT-4o response:', JSON.stringify(data).slice(0, 800));

    if (!apiResponse.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
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