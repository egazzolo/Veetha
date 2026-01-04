export const analyzeFoodImage = async (imageUri) => {
  try {
    // Convert image to base64
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });

    // Call WhatTheFood API
    const apiResponse = await fetch('https://api.whatthefood.io/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64,
      }),
    });

    const data = await apiResponse.json();
    
    return {
      success: true,
      foodName: data.food_name,
      calories: data.nutrition.calories,
      protein: data.nutrition.protein,
      carbs: data.nutrition.carbs,
      fat: data.nutrition.fat,
      sodium: data.nutrition.sodium || 0,
      sugar: data.nutrition.sugar || 0,
      fiber: data.nutrition.fiber || 0,
    };
  } catch (error) {
    console.error('Error analyzing food:', error);
    return { success: false, error: error.message };
  }
};