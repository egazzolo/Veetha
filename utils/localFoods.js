// Common breakfast foods by country/region
export const LOCAL_FOODS = {
  // LATIN AMERICA
  'PE': { // Peru
    name: 'Peru',
    breakfast: [
      { name: 'Pan con mantequilla', calories: 250, protein: 6, carbs: 35, fat: 10, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pan_con_mantequilla.jpg" },
      { name: 'Pan con palta', calories: 320, protein: 8, carbs: 38, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/pan_con_palta.jpg" },
      { name: 'Tamales', calories: 280, protein: 10, carbs: 40, fat: 9, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/tamales.jpg" },
      { name: 'Chicharrón', emoji: '🥓', calories: 450, protein: 25, carbs: 5, fat: 38 },
      { name: 'Café con leche', calories: 80, protein: 4, carbs: 10, fat: 3, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/cafe_con_leche.jpg" },
      { name: 'Jugo de naranja', calories: 110, protein: 2, carbs: 26, fat: 0, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/jugo_de_naranja.jpg" },
    ],
    lunch: [
      { name: 'Arroz con pollo', emoji: '🍗', calories: 450, protein: 30, carbs: 55, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/arroz_con_pollo.jpg" },
      { name: 'Lomo saltado', emoji: '🥩', calories: 520, protein: 35, carbs: 45, fat: 22, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/lomo_saltado.jpg" },
      { name: 'Ceviche', emoji: '🐟', calories: 280, protein: 32, carbs: 15, fat: 8, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/ceviche.jpg" },
      { name: 'Ají de gallina', emoji: '🌶️', calories: 480, protein: 28, carbs: 40, fat: 20, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/aji_de_gallina.jpg" },
    ],
    dinner: [
      { name: 'Causa rellena', calories: 350, protein: 15, carbs: 45, fat: 12, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/causa_rellena.jpg" },
      { name: 'Papa a la huancaína', calories: 320, protein: 12, carbs: 35, fat: 16, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/papa_a_la_huancahina.jpg" },
      { name: 'Sopa de pollo', calories: 220, protein: 18, carbs: 25, fat: 6, image_url: "https://bfgreozkoftncayzyzhz.supabase.co/storage/v1/object/public/foods/sopa_de_pollo.jpg" },
    ]
  },
  
  'MX': { // Mexico
    name: 'Mexico',
    breakfast: [
      { name: 'Huevos con tortillas', emoji: '🥚', calories: 320, protein: 18, carbs: 28, fat: 16 },
      { name: 'Chilaquiles', emoji: '🌶️', calories: 450, protein: 20, carbs: 40, fat: 22 },
      { name: 'Tamales', emoji: '🫔', calories: 280, protein: 10, carbs: 40, fat: 9 },
      { name: 'Pan dulce', emoji: '🥐', calories: 310, protein: 6, carbs: 45, fat: 12 },
      { name: 'Café de olla', emoji: '☕', calories: 90, protein: 1, carbs: 18, fat: 1 },
    ],
    lunch: [
      { name: 'Tacos', emoji: '🌮', calories: 380, protein: 22, carbs: 35, fat: 18 },
      { name: 'Quesadillas', emoji: '🧀', calories: 420, protein: 20, carbs: 40, fat: 20 },
      { name: 'Enchiladas', emoji: '🌯', calories: 460, protein: 24, carbs: 45, fat: 22 },
      { name: 'Pozole', emoji: '🍲', calories: 320, protein: 25, carbs: 35, fat: 10 },
    ]
  },
  
  'VE': { // Venezuela
    name: 'Venezuela',
    breakfast: [
      { name: 'Arepas', emoji: '🫓', calories: 280, protein: 8, carbs: 42, fat: 10 },
      { name: 'Arepas con queso', emoji: '🧀', calories: 380, protein: 16, carbs: 42, fat: 18 },
      { name: 'Cachapa', emoji: '🌽', calories: 320, protein: 10, carbs: 50, fat: 10 },
      { name: 'Pan de jamón', emoji: '🥖', calories: 350, protein: 14, carbs: 40, fat: 16 },
      { name: 'Café con leche', emoji: '☕', calories: 80, protein: 4, carbs: 10, fat: 3 },
    ],
    lunch: [
      { name: 'Pabellón criollo', emoji: '🍛', calories: 550, protein: 30, carbs: 60, fat: 20 },
      { name: 'Hallacas', emoji: '🫔', calories: 480, protein: 22, carbs: 50, fat: 22 },
    ]
  },
  
  // USA
  'US': {
    name: 'United States',
    breakfast: [
      { name: 'Eggs and bacon', emoji: '🍳', calories: 380, protein: 22, carbs: 2, fat: 32 },
      { name: 'Pancakes', emoji: '🥞', calories: 420, protein: 10, carbs: 65, fat: 14 },
      { name: 'Cereal with milk', emoji: '🥣', calories: 280, protein: 8, carbs: 50, fat: 6 },
      { name: 'Bagel with cream cheese', emoji: '🥯', calories: 350, protein: 12, carbs: 48, fat: 14 },
      { name: 'Coffee', emoji: '☕', calories: 5, protein: 0, carbs: 0, fat: 0 },
    ],
    lunch: [
      { name: 'Burger', emoji: '🍔', calories: 540, protein: 28, carbs: 45, fat: 28 },
      { name: 'Pizza slice', emoji: '🍕', calories: 285, protein: 12, carbs: 36, fat: 10 },
      { name: 'Sandwich', emoji: '🥪', calories: 380, protein: 20, carbs: 42, fat: 16 },
      { name: 'Salad', emoji: '🥗', calories: 220, protein: 8, carbs: 18, fat: 14 },
    ]
  },

  // Add more countries as needed...
};

// Fallback for countries not in database
export const DEFAULT_FOODS = {
  breakfast: [
    { name: 'Eggs', emoji: '🥚', calories: 155, protein: 13, carbs: 1, fat: 11 },
    { name: 'Bread', emoji: '🍞', calories: 265, protein: 9, carbs: 49, fat: 3 },
    { name: 'Milk', emoji: '🥛', calories: 150, protein: 8, carbs: 12, fat: 8 },
    { name: 'Coffee', emoji: '☕', calories: 5, protein: 0, carbs: 0, fat: 0 },
    { name: 'Banana', emoji: '🍌', calories: 105, protein: 1, carbs: 27, fat: 0 },
  ],
  lunch: [
    { name: 'Rice', emoji: '🍚', calories: 206, protein: 4, carbs: 45, fat: 0 },
    { name: 'Chicken breast', emoji: '🍗', calories: 165, protein: 31, carbs: 0, fat: 4 },
    { name: 'Salad', emoji: '🥗', calories: 150, protein: 5, carbs: 12, fat: 10 },
  ],
  dinner: [
    { name: 'Pasta', emoji: '🍝', calories: 220, protein: 8, carbs: 43, fat: 1 },
    { name: 'Fish', emoji: '🐟', calories: 206, protein: 22, carbs: 0, fat: 12 },
    { name: 'Vegetables', emoji: '🥦', calories: 55, protein: 4, carbs: 11, fat: 0 },
  ]
};

// Get user's country code from location
export async function getUserCountry() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('❌ Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({});
    const [geocode] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    console.log('📍 User location:', geocode.country, geocode.isoCountryCode);
    return geocode.isoCountryCode; // Returns 'PE', 'MX', 'US', etc.
    
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}

// Get suggestions for current meal time
export function getSuggestionsForMealTime(countryCode) {
  const hour = new Date().getHours();
  
  let mealType;
  if (hour >= 5 && hour < 11) mealType = 'breakfast';
  else if (hour >= 11 && hour < 16) mealType = 'lunch';
  else mealType = 'dinner';

  const countryFoods = LOCAL_FOODS[countryCode];
  
  if (countryFoods && countryFoods[mealType]) {
    return {
      mealType,
      suggestions: countryFoods[mealType],
      country: countryFoods.name
    };
  }

  // Fallback to default
  return {
    mealType,
    suggestions: DEFAULT_FOODS[mealType],
    country: 'Your Area'
  };
}