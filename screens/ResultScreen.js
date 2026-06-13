import React, { useState, useRef, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Image, Modal, Animated, Alert, Button, ActivityIndicator } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Circle } from 'react-native-svg';
import AllergenWarningModal from '../components/AllergenWarningModal';
import GuestUpsellSheet from '../components/GuestUpsellSheet';
import { showToast } from '../components/VeethaToast';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUserMode } from '../utils/UserModeContext';
import { blockIfGuest } from '../utils/guestBlock';
import { logMealLogged } from '../utils/analytics';
import { posthog } from '../utils/posthog';
import { searchFood } from '../utils/foodDatabase';
import AppIcon from '../components/AppIcon';

const detectServingUnit = (productName = '', servingSize) => {
  const nameLower = String(productName || '').toLowerCase();
  
  const drinkKeywords = ['soda', 'juice', 'water', 'milk', 'coffee', 'tea', 'beer', 
                         'wine', 'drink', 'beverage', 'cola', 'fanta', 'sprite',
                         'gaseosa', 'refresco', 'limonada', 'nectar', 'gatorade',
                         'energética', 'energy'];
  
  const isDrink = drinkKeywords.some(keyword => nameLower.includes(keyword));
  
  if (isDrink) {
    // Check if serving size suggests liters vs milliliters
    if (servingSize >= 1000) return 'L';
    return 'ml';
  }
  
  return 'g'; // Default to grams for food
};

// CIRCULAR PROGRESS COMPONENT
function CircularProgress({ percentage, size = 100, strokeWidth = 8, color = '#4CAF50', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          stroke="#e0e0e0"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}

// AUTO-SIZED TEXT COMPONENT
function AutoSizedText({ value, baseSize = 48, minSize = 12, style }) {
  const text = String(value);
  let dynamicSize;
  if (text.length <= 3) {
    dynamicSize = baseSize;
  } else if (text.length === 4) {
    dynamicSize = baseSize * 0.85;
  } else if (text.length === 5) {
    dynamicSize = baseSize * 0.7;
  } else {
    dynamicSize = baseSize * 0.6;
  }
  
  dynamicSize = Math.max(minSize, dynamicSize);
  
  return (
    <Text style={[style, { fontSize: dynamicSize }]}>
      {text}
    </Text>
  );
}

// NUTRIENT MODAL COMPONENT
function NutrientModal({ visible, nutrient, onClose, t }) {
  const nutrientInfo = {
    calories: {
      icon: 'streak',
      title: 'Calories',
      description: 'Unit of energy from food. Your body burns calories constantly - even while sleeping - to power your heart, lungs, brain, digestion, and movement.'
    },
    protein: {
      icon: 'protein',
      title: 'Protein',
      description: 'Builds and repairs muscles, bones, and skin. Also makes enzymes and hormones. Helps you feel full longer after meals.'
    },
    carbs: {
      icon: 'carbs',
      title: 'Carbohydrates',
      description: 'Your body\'s preferred fuel source, especially for your brain and during exercise. Includes sugars (quick energy), starches (sustained energy), and fiber (aids digestion).'
    },
    fat: {
      icon: 'fat',
      title: 'Fat',
      description: 'Essential for absorbing vitamins A, D, E, and K. Makes hormones, protects organs, and insulates your body. Provides long-lasting energy.'
    },
    sugar: {
      icon: 'sugar',
      title: 'Sugars',
      description: 'A type of carbohydrate that gives quick energy. Natural sugars come from fruit and milk. Added sugars are put in during processing.'
    }
  };

  const info = nutrientInfo[nutrient] || {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.nutrientModalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <AppIcon 
            name={info.icon === 'fat' ? 'avocado_clr' : info.icon}
            size={60} 
            tintColor={info.icon === 'fat' ? undefined : ({
              streak: '#FF6B35',
              protein: '#A0522D',
              carbs: '#DAA520',
              sugar: '#E91E63',
              sodium: '#607D8B',
              fiber: '#4CAF50',
            })[info.icon] || '#1F9B39'}
          />
            <Text style={styles.modalTitle}>{info.title}</Text>
            <Text style={styles.modalText}>{info.description}</Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>{t('results.gotIt')}</Text>
            </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// MAIN RESULT SCREEN
export default function ResultScreen({ route, navigation }) {
  const { food } = route.params;
  const { t } = useLanguage();
  const { refreshMeals } = useUser();
  const { user, isGuest } = useUser();
  const { isGuest: isGuestMode } = useUserMode();
  const individualFoods = route.params?.individualFoods || null;
  const [mealViewMode, setMealViewMode] = useState('whole'); // 'whole' or 'individual'
  const [selectedFood, setSelectedFood] = useState(null);
  const [servingGrams, setServingGrams] = useState(food.serving_quantity || route.params?.typicalServing || 100);
  const [inputValue, setInputValue] = useState(String(food.serving_quantity || route.params?.typicalServing || 100));
  const [showDetails, setShowDetails] = useState(false);
  const [showNutrientModal, setShowNutrientModal] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const [userRestrictions, setUserRestrictions] = useState(null);
  const [isLandscapeImage, setIsLandscapeImage] = useState(false);
  const [showAllergenWarning, setShowAllergenWarning] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [allergenWarnings, setAllergenWarnings] = useState([]);
  const [showWrongFoodModal, setShowWrongFoodModal] = useState(false);
  const [wrongFoodInput, setWrongFoodInput] = useState('');
  const [searchingFood, setSearchingFood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestSheetVisible, setGuestSheetVisible] = useState(false);
  const [foodsExpanded, setFoodsExpanded] = useState(true);

  const [viewMode, setViewMode] = useState(
    route.params?.fromMode === 'photo' ? 'photo' : 'detailed'
  );
  const { theme } = useTheme();

  // Swipe animation for detailed view
  const detailedTranslateX = useRef(new Animated.Value(0)).current;
  const detailedRotateZ = useRef(new Animated.Value(0)).current;
  const detailedSwipeOpacity = useRef(new Animated.Value(0)).current;
  const [detailedSwipeDirection, setDetailedSwipeDirection] = useState(null);

  // Helper function
  const getMacroLabel = (key) => {
    const labels = {
      protein: t('results.protein'),
      carbs: t('results.carbs'),
      fat: t('results.fat'),
      sugar: t('results.sugar'),
    };
    return (labels[key] || key) + " ⓘ";
  };

  const dailyCalorieGoal = 2000; // Default, should come from user profile

  const handleWrongFood = async () => {
    if (!wrongFoodInput || !wrongFoodInput.trim()) {
      Alert.alert(t('results.enterFoodName'));
      return;
    }

    const corrected = await searchFood(wrongFoodInput.trim());

    if (!corrected) {
      Alert.alert(t('results.notFound'));
      return;
    }

    setShowWrongFoodModal(false);

    navigation.replace('Result', {
      food: {
        product_name: corrected.product_name,   // 🔥 REQUIRED
        nutriments: corrected.nutriments,
        serving_size: corrected.serving_size,
        image_url: food.image_url,
        detected_by_ai: false,
        ai_detected_name: food.product_name,
      },
      fromMode: 'photo',
    });
  };

  const activeFoodNutriments = mealViewMode === 'individual' && selectedFood ? {
    'energy-kcal_100g': selectedFood.calories_per_100g || 0,
    proteins_100g: selectedFood.protein_per_100g || 0,
    carbohydrates_100g: selectedFood.carbs_per_100g || 0,
    fat_100g: selectedFood.fat_per_100g || 0,
    fiber_100g: 0,
    sugars_100g: 0,
    sodium_100g: 0,
  } : food.nutriments;

  const nutritionValues = {
    calories: activeFoodNutriments?.['energy-kcal_100g'] !== undefined 
      ? ((activeFoodNutriments['energy-kcal_100g'] * servingGrams) / 100).toFixed(1) 
      : "N/A",
    protein: activeFoodNutriments?.proteins_100g !== undefined 
      ? ((activeFoodNutriments.proteins_100g * servingGrams) / 100).toFixed(1) 
      : "N/A",
    carbs: activeFoodNutriments?.carbohydrates_100g !== undefined 
      ? ((activeFoodNutriments.carbohydrates_100g * servingGrams) / 100).toFixed(1) 
      : "N/A",
    fat: activeFoodNutriments?.fat_100g !== undefined 
      ? ((activeFoodNutriments.fat_100g * servingGrams) / 100).toFixed(1) 
      : "N/A",
    fiber: activeFoodNutriments?.fiber_100g !== undefined 
      ? ((activeFoodNutriments.fiber_100g * servingGrams) / 100).toFixed(1) 
      : "N/A",
    sugar: activeFoodNutriments?.sugars_100g !== undefined 
      ? ((activeFoodNutriments.sugars_100g * servingGrams) / 100).toFixed(1) 
      : "N/A",
    sodium: activeFoodNutriments?.sodium_100g !== undefined 
      ? ((activeFoodNutriments.sodium_100g * servingGrams) / 100).toFixed(1) 
      : "N/A",
  };

  // Check if product has nutrition data
  const hasNutritionData = food.nutriments && 
    (food.nutriments["energy-kcal_100g"] || 
    food.nutriments.proteins_100g || 
    food.nutriments.carbohydrates_100g || 
    food.nutriments.fat_100g);

  // Calculate percentages for circular progress
  const caloriePercent = nutritionValues.calories !== "N/A" ? (parseFloat(nutritionValues.calories) / dailyCalorieGoal) * 100 : 0;
  const proteinPercent = nutritionValues.protein !== "N/A" ? (parseFloat(nutritionValues.protein) / 50) * 100 : 0;
  const carbsPercent = nutritionValues.carbs !== "N/A" ? (parseFloat(nutritionValues.carbs) / 275) * 100 : 0;
  const fatPercent = nutritionValues.fat !== "N/A" ? (parseFloat(nutritionValues.fat) / 78) * 100 : 0;

  // Check for allergens and dietary restrictions
  const checkAllergens = async () => {
    if (isGuest || !user) return;
    try {

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('allergies, diet_type, dietary_preferences')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUserRestrictions(profile);

      // Get ingredients from product
      const ingredients = food.ingredients_text?.toLowerCase() || '';
      const warnings = [];

      // Check allergies
      if (profile.allergies && profile.allergies.length > 0) {
        const allergenMap = {
          'peanuts': { keywords: ['peanut', 'groundnut'], emoji: '🥜', label: 'Peanuts' },
          'dairy': { keywords: ['milk', 'dairy', 'lactose', 'cheese', 'butter', 'cream', 'whey', 'casein'], emoji: '🥛', label: 'Dairy' },
          'shellfish': { keywords: ['shrimp', 'crab', 'lobster', 'shellfish', 'prawn'], emoji: '🦐', label: 'Shellfish' },
          'eggs': { keywords: ['egg', 'albumin'], emoji: '🥚', label: 'Eggs' },
          'soy': { keywords: ['soy', 'soya'], emoji: '🫘', label: 'Soy' },
          'wheat': { keywords: ['wheat', 'gluten'], emoji: '🌾', label: 'Wheat' },
          'fish': { keywords: ['fish', 'salmon', 'tuna', 'cod'], emoji: '🐟', label: 'Fish' },
          'tree_nuts': { keywords: ['almond', 'walnut', 'cashew', 'pistachio', 'pecan', 'hazelnut', 'macadamia'], emoji: '🌰', label: 'Tree Nuts' },
        };

        profile.allergies.forEach(allergy => {
          const allergenInfo = allergenMap[allergy];
          if (allergenInfo) {
            const found = allergenInfo.keywords.some(keyword => ingredients.includes(keyword));
            if (found) {
              warnings.push({
                emoji: allergenInfo.emoji,
                label: allergenInfo.label,
                reason: 'Marked as allergen',
              });
            }
          }
        });
      }

      // Check diet type
      if (profile.diet_type && profile.diet_type !== 'none') {
        const dietChecks = {
          'vegan': () => {
            const nonVegan = ['milk', 'dairy', 'egg', 'honey', 'meat', 'chicken', 'beef', 'pork', 'fish', 'gelatin'];
            return nonVegan.some(item => ingredients.includes(item));
          },
          'vegetarian': () => {
            const nonVegetarian = ['meat', 'chicken', 'beef', 'pork', 'fish', 'gelatin'];
            return nonVegetarian.some(item => ingredients.includes(item));
          },
          'pescatarian': () => {
            const nonPescatarian = ['meat', 'chicken', 'beef', 'pork'];
            return nonPescatarian.some(item => ingredients.includes(item));
          },
        };

        const check = dietChecks[profile.diet_type];
        if (check && check()) {
          warnings.push({
            emoji: '🥗',
            label: `Not ${profile.diet_type}`,
            reason: `Your diet: ${profile.diet_type.charAt(0).toUpperCase() + profile.diet_type.slice(1)}`,
          });
        }
      }

      // Check preferences
      if (profile.dietary_preferences && profile.dietary_preferences.length > 0) {
        const preferenceMap = {
          'gluten_free': { keywords: ['wheat', 'gluten', 'barley', 'rye'], emoji: '🌾', label: 'Contains Gluten' },
          'lactose_free': { keywords: ['milk', 'lactose', 'dairy'], emoji: '🥛', label: 'Contains Lactose' },
          'low_sodium': { keywords: [], emoji: '🧂', label: 'High Sodium', checkNutrition: true },
          'sugar_free': { keywords: [], emoji: '🍬', label: 'Contains Sugar', checkNutrition: true },
        };

        profile.dietary_preferences.forEach(pref => {
          const prefInfo = preferenceMap[pref];
          if (prefInfo) {
            if (prefInfo.checkNutrition) {
              // Check nutrition values
              if (pref === 'low_sodium' && food.nutriments?.sodium_100g > 0.3) {
                warnings.push({
                  emoji: prefInfo.emoji,
                  label: prefInfo.label,
                  reason: `Preference: Low sodium`,
                });
              }
              if (pref === 'sugar_free' && food.nutriments?.sugars_100g > 5) {
                warnings.push({
                  emoji: prefInfo.emoji,
                  label: prefInfo.label,
                  reason: `Preference: Sugar-free`,
                });
              }
            } else {
              // Check ingredients
              const found = prefInfo.keywords.some(keyword => ingredients.includes(keyword));
              if (found) {
                warnings.push({
                  emoji: prefInfo.emoji,
                  label: prefInfo.label,
                  reason: `Preference: ${pref.replace('_', ' ')}`,
                });
              }
            }
          }
        });
      }

      if (warnings.length > 0) {
        setAllergenWarnings(warnings);
        setShowAllergenWarning(true);
      }
    } catch (error) {
      console.error('Error checking allergens:', error);
    }
  };

  // Call check on screen load
  useEffect(() => {
    checkAllergens();
  }, []);

  const handleLogMeal = async () => {
    if (blockIfGuest(isGuestMode, navigation, () => {}, t, () => setGuestSheetVisible(true))) return;
    try {
      setSavingMeal(true);
      console.log('🔥 HANDLE LOG MEAL STARTED', { isGuest, user });

      /* ===== GUEST MODE EARLY EXIT ===== */
      if (isGuest) {

        console.log('👤 GUEST SAVE START');

        const existingMeals =
          JSON.parse(await AsyncStorage.getItem('guest_meals') || '[]');

        existingMeals.unshift({
          id: Date.now(),
          serving_grams: servingGrams,
          product: {
            name: food.product_name || food.name || 'Unknown food',
            calories: food.calories || 0,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fat: food.fat || 0,
            image_url: imageUrl,
          },
          logged_at: new Date().toISOString(),
        });

        await AsyncStorage.setItem(
          'guest_meals',
          JSON.stringify(existingMeals)
        );

        console.log('✅ GUEST MEAL SAVED');
        posthog.capture('meal_logged', { source: route.params?.fromMode || 'unknown', mode: 'guest' });

        setSavingMeal(false);
        navigation.goBack();
        return;
      }

      console.log('📝 Starting meal log process...');
      console.log('Food data:', { name: food.product_name, nutriments: food.nutriments });

      // STEP 1: Upload image to Supabase Storage (if photo was taken)
      let imageUrl = null;

      if (food.image_url && food.image_url.startsWith('file://')) {
        console.log('='.repeat(50));
        console.log('🖼️ IMAGE UPLOAD START');
        console.log('Original URI:', food.image_url);

        try {
          // Fetch local file and convert to ArrayBuffer (reliable in RN 0.81+)
          console.log('Reading image file...');
          const response = await fetch(food.image_url);
          const arrayBuffer = await response.arrayBuffer();
          console.log('✅ ArrayBuffer created, size:', arrayBuffer.byteLength, 'bytes');

          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error('Image file is empty');
          }

          // Generate unique filename
          const fileName = `meal-${user.id}-${Date.now()}.jpg`;
          console.log('📤 Uploading to Supabase as:', fileName);

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('meal-images')
            .upload(fileName, arrayBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('❌ Upload failed:', JSON.stringify(uploadError));
            throw uploadError;
          }

          console.log('✅ Upload successful! Path:', uploadData.path);

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('meal-images')
            .getPublicUrl(fileName);

          imageUrl = urlData.publicUrl;
          console.log('✅ Public URL:', imageUrl);
          console.log('🖼️ IMAGE UPLOAD END');
          console.log('='.repeat(50));

        } catch (error) {
          console.error('❌ Image upload failed:', error.message);
          console.error('Full error:', JSON.stringify(error));
          // Don't block meal logging if image upload fails
        }
      } else if (food.image_url && food.image_url.startsWith('http')) {
        // Remote URL (e.g., from OpenFoodFacts barcode scan) — use directly
        imageUrl = food.image_url;
        console.log('🌐 Using remote image URL:', imageUrl);
      } else {
        console.log('ℹ️ No image available');
      }

      // STEP 2: Check if food exists in food_database (by name or barcode)
      let productId = null;

      if (!isGuest) {

        console.log('🔍 Checking if food exists in database...');

        const barcode = food.barcode || food.code;
        let existingProduct = null;

        // Check by barcode FIRST (more reliable than name)
        if (barcode) {
          const { data } = await supabase
            .from('food_database')
            .select('id')
            .eq('barcode', barcode)
            .maybeSingle();
          existingProduct = data;
        }

        // Fallback to name lookup if barcode didn't match
        if (!existingProduct && (food.product_name || food.name)) {
          const { data } = await supabase
            .from('food_database')
            .select('id')
            .eq('name', food.product_name || food.name)
            .maybeSingle();
          existingProduct = data;
        }

        if (existingProduct) {
          productId = existingProduct.id;
          // Update barcode if missing
          if ((food.barcode || food.code) && !existingProduct.barcode) {
            await supabase
              .from('food_database')
              .update({ barcode: food.barcode || food.code })
              .eq('id', productId);
          }
        } else {

          console.log('➕ Creating new product in food_database...');

          const { data: newProduct, error: productError } = await supabase
            .from('food_database')
            .insert({
              name: food.product_name || food.name || 'Unknown food',
              calories: food.nutriments?.['energy-kcal_100g'] || food.nutriments?.['energy-kcal'] || food.calories || 0,
              protein: food.nutriments?.proteins_100g || food.nutriments?.proteins || food.protein || 0,
              carbs: food.nutriments?.carbohydrates_100g || food.nutriments?.carbohydrates || food.carbs || 0,
              fat: food.nutriments?.fat_100g || food.nutriments?.fat || food.fat || 0,
              fiber: food.nutriments?.fiber_100g || food.nutriments?.fiber || 0,
              sugar: food.nutriments?.sugars_100g || food.nutriments?.sugar || 0,
              sodium: food.nutriments?.sodium_100g || food.nutriments?.sodium || 0,
              image_url: imageUrl,
              barcode: food.barcode || food.code || null,
            })
            .select('id, barcode')
            .single();

          if (productError) throw productError;

          productId = newProduct.id;
          console.log('PRODUCT ID BEING INSERTED:', productId);
        }

        console.log('INSERTING MEAL WITH PRODUCT ID:', productId);

        const { error } = await supabase
          .from('meals')
          .insert({
            user_id: user.id,
            product_id: productId,
            serving_grams: servingGrams,
            barcode: food.barcode || null,
            meal_type: null,
            image_url: imageUrl,
            logged_at: new Date().toISOString(),
          });

        if (error) throw error;
        console.log('✅ SUPABASE MEAL INSERT SUCCESS');

      }

      console.log('✅ Meal logged successfully!');
      posthog.capture('meal_logged', { source: route.params?.fromMode || 'unknown', mode: 'auth' });

      // Refresh meals list before navigating
      await refreshMeals();

      // Navigate back to Home
      showToast('success', t('results.mealLogged'), `${food.product_name}`);
      navigation.navigate('Home');
      
    } catch (error) {
      console.error('❌ Error logging meal:', error);
      
      // Show the ACTUAL error to user (for debugging)
      Alert.alert(
        t('common.error'),
        `${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setSavingMeal(false);
    }
  };

  // Swipe gesture for detailed view
  const detailedSwipeGesture = Gesture.Pan()
      .activeOffsetX([-10, 10])  // Only activate for horizontal movement
      .failOffsetY([-10, 10])    // Fail (allow ScrollView) for vertical movement
      .onUpdate((e) => {
      // Block rightward movement for guests
      if (isGuestMode && e.translationX > 0) {
        detailedTranslateX.setValue(0);
        detailedRotateZ.setValue(0);
        return;
      }
      detailedTranslateX.setValue(e.translationX);
      detailedRotateZ.setValue(e.translationX / 30);

      if (e.translationX > 50) {
        setDetailedSwipeDirection('right');
        detailedSwipeOpacity.setValue(Math.min(e.translationX / 100, 1));
      } else if (e.translationX < -50) {
        setDetailedSwipeDirection('left');
        detailedSwipeOpacity.setValue(Math.min(Math.abs(e.translationX) / 100, 1));
      } else {
        setDetailedSwipeDirection(null);
        detailedSwipeOpacity.setValue(0);
      }
    })
    .onEnd((e) => {
      if (isGuestMode && e.translationX > 0) {
        // Guest tried to swipe right — show prompt, snap back
        blockIfGuest(isGuestMode, navigation, () => {}, t, () => setGuestSheetVisible(true));
        detailedTranslateX.setValue(0);
        detailedRotateZ.setValue(0);
        setDetailedSwipeDirection(null);
        detailedSwipeOpacity.setValue(0);
        return;
      }
      if (e.translationX > 100) {
        // Right swipe - Save
        Animated.parallel([
          Animated.timing(detailedTranslateX, {
            toValue: 500,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(detailedRotateZ, {
            toValue: 20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          handleLogMeal();
        });
      } else if (e.translationX < -100) {
        // Left swipe - Delete/Go back
        Animated.parallel([
          Animated.timing(detailedTranslateX, {
            toValue: -500,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(detailedRotateZ, {
            toValue: -20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          navigation.navigate('Home');
        });
      } else {
        // Snap back
        Animated.parallel([
          Animated.spring(detailedTranslateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(detailedRotateZ, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
        setDetailedSwipeDirection(null);
        detailedSwipeOpacity.setValue(0);
      }
    });

  const detailedRotate = detailedRotateZ.interpolate({
    inputRange: [-20, 20],
    outputRange: ['-20deg', '20deg'],
  });

  // Photo View Component
  const PhotoView = () => {
    if (!food.image_url) return null;

    const translateX = useRef(new Animated.Value(0)).current;
    const rotateZ = useRef(new Animated.Value(0)).current;
    const swipeOpacity = useRef(new Animated.Value(0)).current;
    const [swipeDirection, setSwipeDirection] = useState(null); // 'left' or 'right'

    const swipe = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
        // Block rightward movement for guests
        if (isGuestMode && e.translationX > 0) {
          translateX.setValue(0);
          rotateZ.setValue(0);
          return;
        }
        translateX.setValue(e.translationX);
        rotateZ.setValue(e.translationX / 20); // Rotate based on swipe

        // Show swipe indicators
        if (e.translationX > 50) {
          setSwipeDirection('right');
          swipeOpacity.setValue(Math.min(e.translationX / 100, 1));
        } else if (e.translationX < -50) {
          setSwipeDirection('left');
          swipeOpacity.setValue(Math.min(Math.abs(e.translationX) / 100, 1));
        } else {
          setSwipeDirection(null);
          swipeOpacity.setValue(0);
        }
      })
      .onEnd((e) => {
        if (isGuestMode && e.translationX > 0) {
          // Guest tried to swipe right — show prompt, snap back
          blockIfGuest(isGuestMode, navigation, () => {}, t, () => setGuestSheetVisible(true));
          translateX.setValue(0);
          rotateZ.setValue(0);
          setSwipeDirection(null);
          swipeOpacity.setValue(0);
          return;
        }
        if (e.translationX > 100) {
          // Right swipe - Save with animation
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 500,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(rotateZ, {
              toValue: 25,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            handleLogMeal();
          });
        } else if (e.translationX < -100) {
          // Left swipe - Delete with animation
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -500,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(rotateZ, {
              toValue: -25,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            navigation.navigate('Home');
          });
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(rotateZ, {
              toValue: 0,
              useNativeDriver: true,
            }),
          ]).start();
          setSwipeDirection(null);
          swipeOpacity.setValue(0);
        }
      });

    const rotate = rotateZ.interpolate({
      inputRange: [-20, 20],
      outputRange: ['-20deg', '20deg'],
    });

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={swipe}>
          <Animated.View
            style={[
              styles.photoViewContainer,
              {
                transform: [
                  { translateX },
                  { rotate },
                ],
              },
            ]}
          >
            <Image 
              source={{ uri: food.image_url }} 
              style={styles.photoViewImage}
              resizeMode="cover"
            />

            <View style={styles.photoMealNameContainer}>
              <Text style={styles.photoMealName}>{food.product_name}</Text>

              {route.params?.topSuggestions?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                  {route.params.topSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{ backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#1F9B39' }}
                      onPress={async () => {
                        const corrected = await searchFood(suggestion.name);
                        if (!corrected) return;
                        navigation.replace('Result', {
                          food: { product_name: corrected.name, image_url: food.image_url, nutriments: { 'energy-kcal_100g': corrected.nutrients['energy-kcal'] || 0, proteins_100g: corrected.nutrients.proteins || 0, carbohydrates_100g: corrected.nutrients.carbohydrates || 0, fat_100g: corrected.nutrients.fat || 0 }, serving_quantity: 100, detected_by_ai: false },
                          fromMode: 'photo',
                          topSuggestions: route.params.topSuggestions,
                        });
                      }}
                    >
                      <Text style={{ color: '#1F9B39', fontSize: 13 }}>{suggestion.name} ({suggestion.confidence}%)</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {route.params?.fromMode === 'photo' && (
                <TouchableOpacity onPress={() => setShowWrongFoodModal(true)} style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name="edit" size={16} style={{ marginRight: 6 }} />
                    <Text style={{ color: '#4CAF50', fontWeight: '600', textAlign: 'center' }}>
                      {t('results.wrongFood')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
            
            {/* LEFT SWIPE INDICATOR (Delete) */}
            {swipeDirection === 'left' && (
              <Animated.View
                style={[
                  styles.swipeIndicator,
                  styles.swipeIndicatorLeft,
                  { opacity: swipeOpacity },
                ]}
              >
                <Text style={styles.swipeIndicatorText}>✕</Text>
                <Text style={styles.swipeIndicatorLabel}>{t('results.delete')}</Text>
              </Animated.View>
            )}

            {/* RIGHT SWIPE INDICATOR (Save) */}
            {swipeDirection === 'right' && (
              <Animated.View
                style={[
                  styles.swipeIndicator,
                  styles.swipeIndicatorRight,
                  { opacity: swipeOpacity },
                ]}
              >
                <Text style={styles.swipeIndicatorText}>✓</Text>
                <Text style={styles.swipeIndicatorLabel}>{t('results.save')}</Text>
              </Animated.View>
            )}
            
            {/* Macro Badges Overlay */}
            <View style={styles.macroBadgesContainer}>
              <View style={[styles.macroBadge, { backgroundColor: '#4CAF50' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="streak" size={16} tintColor="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.macroBadgeLabel}>{t('results.caloriesInfo')}</Text>
                </View>
                <Text style={styles.macroBadgeValue}>{nutritionValues.calories}</Text>
              </View>
              
              <View style={[styles.macroBadge, { backgroundColor: '#2196F3' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="protein" size={16} tintColor="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.macroBadgeLabel}>{t('results.protein')}: </Text>
                </View>
                <Text style={styles.macroBadgeValue}>{nutritionValues.protein}g</Text>
              </View>
              
              <View style={[styles.macroBadge, { backgroundColor: '#FF9800' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="carbs" size={16} tintColor="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.macroBadgeLabel}>{t('results.carbs')}: </Text>
                </View>
                <Text style={styles.macroBadgeValue}>{nutritionValues.carbs}g</Text>
              </View>
              
              <View style={[styles.macroBadge, { backgroundColor: '#9C27B0' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="fat" size={16} tintColor="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.macroBadgeLabel}>{t('results.fat')}: </Text>
                </View>
                <Text style={styles.macroBadgeValue}>{nutritionValues.fat}g</Text>
              </View>
            </View>

            {/* Swipe Hints */}
            <View style={styles.swipeHints}>
              <Text style={styles.swipeHintText}>← {t('results.swipeLeftDelete')}</Text>
              <Text style={styles.swipeHintText}>{t('results.swipeRightSave')} →</Text>
            </View>
            
            {/* Foods Detected Panel */}
            {individualFoods && individualFoods.length > 1 ? (
              <View style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                backgroundColor: 'rgba(15,15,15,0.92)',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 24,
              }}>
                {/* Drag handle + toggle */}
                <TouchableOpacity
                  onPress={() => setFoodsExpanded(prev => !prev)}
                  style={{ alignItems: 'center', marginBottom: 8 }}
                >
                  <View style={{ width: 36, height: 4, backgroundColor: '#555', borderRadius: 2, marginBottom: 8 }} />
                  <Text style={{ color: '#888', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                    {foodsExpanded ? '▼ Foods detected' : '▲ Foods detected'}
                  </Text>
                </TouchableOpacity>

                {foodsExpanded ? (
                  <>
                    {individualFoods.map((f, i) => {
                      const isSelected = mealViewMode === 'individual' && selectedFood?.food_name === f.food_name;
                      const estKcal = Math.round((f.calories_per_100g * (f.typical_serving_grams || 100)) / 100);
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => { setMealViewMode('individual'); setSelectedFood(f); }}
                          style={{
                            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginBottom: 6,
                            backgroundColor: isSelected ? '#1F9B39' : 'rgba(255,255,255,0.07)',
                            borderWidth: 1, borderColor: isSelected ? '#1F9B39' : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', textTransform: 'capitalize', flex: 1 }}>
                            {f.food_name}
                          </Text>
                          <Text style={{ color: isSelected ? '#d4f5dc' : '#777', fontSize: 13 }}>
                            ~{estKcal} kcal
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      onPress={() => { setMealViewMode('whole'); setSelectedFood(null); }}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginBottom: 10,
                        backgroundColor: mealViewMode === 'whole' ? '#1F9B39' : 'rgba(255,255,255,0.07)',
                        borderWidth: 1, borderColor: mealViewMode === 'whole' ? '#1F9B39' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>🍽️ Entire meal</Text>
                      <Text style={{ color: mealViewMode === 'whole' ? '#d4f5dc' : '#777', fontSize: 13 }}>
                        {nutritionValues.calories} kcal
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={{ alignSelf: 'center', backgroundColor: '#1F9B39', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 4 }}
                    onPress={() => setViewMode('detailed')}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>📊 {t('results.detailedView')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* No individual foods — just show Detailed View button */
              <TouchableOpacity
                style={styles.switchViewButton}
                onPress={() => setViewMode('detailed')}
              >
                <Text style={styles.switchViewButtonText}>📊 {t('results.detailedView')}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {viewMode === 'photo' && food.image_url ? (
        <PhotoView />
      ) : (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GestureDetector gesture={detailedSwipeGesture}>
            <Animated.View
              style={{
                flex: 1,
                transform: [
                  { translateX: detailedTranslateX },
                  { rotate: detailedRotate },
                ],
              }}
            >
              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.resultBox}>
                  
                  {/* LEFT SWIPE INDICATOR (Delete) */}
                  {detailedSwipeDirection === 'left' && (
                    <Animated.View
                      style={[
                        styles.swipeIndicator,
                        styles.swipeIndicatorLeft,
                        { opacity: detailedSwipeOpacity },
                      ]}
                    >
                      <Text style={styles.swipeIndicatorText}>✕</Text>
                      <Text style={styles.swipeIndicatorLabel}>{t('results.delete')}</Text>
                    </Animated.View>
                  )}

                  {/* RIGHT SWIPE INDICATOR (Save) */}
                  {detailedSwipeDirection === 'right' && (
                    <Animated.View
                      style={[
                        styles.swipeIndicator,
                        styles.swipeIndicatorRight,
                        { opacity: detailedSwipeOpacity },
                      ]}
                    >
                      <Text style={styles.swipeIndicatorText}>✓</Text>
                      <Text style={styles.swipeIndicatorLabel}>{t('results.save')}</Text>
                    </Animated.View>
                  )}
                  
                  {/* Product Header with Image */}
                  <View style={[styles.productHeader, isLandscapeImage && styles.productHeaderVertical]}>
                    {food.image_url && (
                      <Image 
                        source={{ uri: food.image_url }} 
                        style={styles.productImage}
                        resizeMode="contain"
                      />
                    )}

                    <Text style={styles.resultTitle}>{food.product_name}</Text>

                    {individualFoods && individualFoods.length > 1 && (
                      <View style={{ flexDirection: 'row', marginTop: 8, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#1F9B39' }}>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: 6, backgroundColor: mealViewMode === 'whole' ? '#1F9B39' : 'transparent', alignItems: 'center' }}
                          onPress={() => { setMealViewMode('whole'); setSelectedFood(null); }}
                        >
                          <Text style={{ color: mealViewMode === 'whole' ? '#fff' : '#1F9B39', fontSize: 12, fontWeight: '600' }}>
                            {t('results.wholeMeal') || 'Whole Meal'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, paddingVertical: 6, backgroundColor: mealViewMode === 'individual' ? '#1F9B39' : 'transparent', alignItems: 'center' }}
                          onPress={() => { setMealViewMode('individual'); setSelectedFood(individualFoods[0]); }}
                        >
                          <Text style={{ color: mealViewMode === 'individual' ? '#fff' : '#1F9B39', fontSize: 12, fontWeight: '600' }}>
                            {t('results.individualFoods') || 'Individual'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {mealViewMode === 'individual' && individualFoods && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, justifyContent: 'center' }}>
                        {individualFoods.map((f, i) => (
                          <TouchableOpacity
                            key={i}
                            style={{ backgroundColor: selectedFood?.food_name === f.food_name ? '#1F9B39' : '#f0f0f0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}
                            onPress={() => setSelectedFood(f)}
                          >
                            <Text style={{ color: selectedFood?.food_name === f.food_name ? '#fff' : '#333', fontSize: 13 }}>
                              {f.food_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {route.params?.topSuggestions?.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                        {route.params.topSuggestions.map((suggestion, index) => (
                          <TouchableOpacity
                            key={index}
                            style={{ backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#1F9B39' }}
                            onPress={async () => {
                              const corrected = await searchFood(suggestion.name);
                              if (!corrected) return;
                              navigation.replace('Result', {
                                food: { product_name: corrected.name, image_url: food.image_url, nutriments: { 'energy-kcal_100g': corrected.nutrients['energy-kcal'] || 0, proteins_100g: corrected.nutrients.proteins || 0, carbohydrates_100g: corrected.nutrients.carbohydrates || 0, fat_100g: corrected.nutrients.fat || 0 }, serving_quantity: 100, detected_by_ai: false },
                                fromMode: 'photo',
                                topSuggestions: route.params.topSuggestions,
                              });
                            }}
                          >
                            <Text style={{ color: '#1F9B39', fontSize: 13 }}>{suggestion.name} ({suggestion.confidence}%)</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* 👇 WRONG FOOD BUTTON — ALWAYS AVAILABLE */}
                    {route.params?.fromMode === 'photo' && (
                      <TouchableOpacity
                        style={{ marginTop: 6 }}
                        onPress={() => setShowWrongFoodModal(true)}  // ✅ Correct
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <AppIcon name="edit" size={16} style={{ marginRight: 6 }} />
                          <Text style={{ color: '#2196F3', fontWeight: '600' }}>
                            {t('results.wrongFood')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>

                  {food.image_url && (
                    <TouchableOpacity 
                      style={styles.photoModeButton}
                      onPress={() => setViewMode('photo')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <AppIcon name="camera" size={16} tintColor="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.photoModeButtonText}>{t('results.photoView')}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {/* Error Message or Nutrition Display */}
                  {food.error_message ? (
                    <View>
                      <Text style={[styles.resultText, { color: 'red', marginTop: 10 }]}>
                        {food.error_message}
                      </Text>
                      
                      {/* Action Buttons for Missing Products */}
                      <View style={{ marginTop: 20, gap: 10 }}>
                        <TouchableOpacity 
                          style={[styles.logMealButton, { backgroundColor: '#FF9800' }]}
                          onPress={() => {
                            navigation.navigate('SubmitProduct', { 
                              barcode: food.barcode || food.code 
                            });
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <AppIcon name="camera" size={18} tintColor="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.logMealButtonText}>{t('results.submitProduct')}</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setShowWrongFoodModal(true);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name="edit" size={16} style={{ marginRight: 6 }} />
                            <Text>{t('results.wrongFood')}</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.navButton, { backgroundColor: '#666' }]}
                          onPress={() => navigation.navigate('Home')}
                        >
                          <Text style={styles.navButtonText}>← {route.params?.fromMode === 'photo' ? t('scanner.takeAnotherPhoto') : t('scanner.scanAgain')}: </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      {/* Serving Size Input */}
                      <View style={styles.servingCard}>
                        <Text style={styles.servingLabel}>{t('results.servingSize')}</Text>
                        <TextInput
                          style={styles.servingInput}
                          keyboardType="numeric"
                          value={inputValue}
                          onChangeText={(text) => {
                            const sanitized = text.replace(/[^0-9.]/g, '');
                            const parts = sanitized.split('.');
                            const validInput = parts.length > 2 
                              ? `${parts[0]}.${parts.slice(1).join('')}` 
                              : sanitized;
                            
                            setInputValue(validInput);
                            const num = parseFloat(validInput);
                            
                            if (!isNaN(num) && num > 0) {
                              if (num > 2000) {
                                setServingGrams(2000);
                                setInputValue('2000');
                              } else {
                                setServingGrams(num);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!inputValue || Number(inputValue) <= 0) {
                              setInputValue('100');
                              setServingGrams(100);
                            }
                          }}
                        />
                        {Number(inputValue) >= 2000 && (
                          <Text style={{ color: 'orange', fontSize: 12, textAlign: 'center' }}>
                            {t('results.maximumAllowed')}
                          </Text>
                        )}
                        <Text style={styles.servingHint}>
                          {food.serving_size || t('results.adjustPortion')}
                        </Text>
                      </View>

                      {/* Calories Display with Circular Progress */}
                      <TouchableOpacity 
                        style={styles.calorieCard}
                        onPress={() => {
                          setSelectedNutrient('calories');
                          setShowNutrientModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.calorieLabel}>{t('results.caloriesInfo')}</Text>
                        <CircularProgress percentage={caloriePercent} size={140} strokeWidth={10} color="#4CAF50">
                          <View style={{ alignItems: 'center' }}>
                            <AutoSizedText value={nutritionValues.calories} baseSize={48} style={styles.calorieValue} />
                            <Text style={styles.calorieUnit}>{t('results.kcal')}</Text>
                          </View>
                        </CircularProgress>
                        <Text style={styles.percentageText}>
                          {caloriePercent.toFixed(0)}{t('results.ofDailyGoal')}
                        </Text>
                      </TouchableOpacity>

                      {/* Macros Display */}
                      <View style={styles.macrosContainer}>
                        {/* Protein */}
                        <TouchableOpacity 
                          style={styles.macroItem}
                          onPress={() => {
                            setSelectedNutrient('protein');
                            setShowNutrientModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <CircularProgress percentage={proteinPercent} size={80} strokeWidth={6} color="#2196F3">
                            <AutoSizedText 
                              value={nutritionValues.protein !== "N/A" ? nutritionValues.protein : "N/A"} 
                              baseSize={16} 
                              minSize={10} 
                              style={styles.macroValueSmall} 
                            />
                          </CircularProgress>
                          <Text style={styles.macroLabel}>{getMacroLabel('protein')}</Text>
                          {nutritionValues.protein !== "N/A" && (
                            <Text style={styles.macroUnit}>{nutritionValues.protein}g</Text>
                          )}
                        </TouchableOpacity>

                        {/* Carbs */}
                        <TouchableOpacity 
                          style={styles.macroItem}
                          onPress={() => {
                            setSelectedNutrient('carbs');
                            setShowNutrientModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <CircularProgress percentage={carbsPercent} size={80} strokeWidth={6} color="#FF9800">
                            <AutoSizedText 
                              value={nutritionValues.carbs !== "N/A" ? nutritionValues.carbs : "N/A"} 
                              baseSize={16} 
                              minSize={10} 
                              style={styles.macroValueSmall} 
                            />
                          </CircularProgress>
                          <Text style={styles.macroLabel}>{getMacroLabel('carbs')}</Text>
                          {nutritionValues.carbs !== "N/A" && (
                            <Text style={styles.macroUnit}>{nutritionValues.carbs}g</Text>
                          )}
                        </TouchableOpacity>

                        {/* Fat */}
                        <TouchableOpacity 
                          style={styles.macroItem}
                          onPress={() => {
                            setSelectedNutrient('fat');
                            setShowNutrientModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <CircularProgress percentage={fatPercent} size={80} strokeWidth={6} color="#9C27B0">
                            <AutoSizedText 
                              value={nutritionValues.fat !== "N/A" ? nutritionValues.fat : "N/A"} 
                              baseSize={16} 
                              minSize={10} 
                              style={styles.macroValueSmall} 
                            />
                          </CircularProgress>
                          <Text style={styles.macroLabel}>{getMacroLabel('fat')}</Text>
                          {nutritionValues.fat !== "N/A" && (
                            <Text style={styles.macroUnit}>{nutritionValues.fat}g</Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Show/Hide Details Button */}
                      <TouchableOpacity 
                        style={styles.expandButton}
                        onPress={() => setShowDetails(!showDetails)}
                      >
                        <Text style={styles.expandText}>
                          {showDetails ? `▲ ${t('results.hideDetails')}` : `▼ ${t('results.showDetails')}`}
                        </Text>
                      </TouchableOpacity>

                      {/* Detailed Nutrition Facts */}
                      {showDetails && (
                        <View style={styles.detailsCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <AppIcon name="sugar" size={16} tintColor="#E91E63" style={{ marginRight: 6 }} />
                            <Text style={styles.detailItem}>{t('results.sugar')}: {nutritionValues.sugar !== "N/A" ? nutritionValues.sugar + "g" : "N/A"}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <AppIcon name="fiber" size={16} tintColor="#4CAF50" style={{ marginRight: 6 }} />
                            <Text style={styles.detailItem}>{t('results.fiber')}: {nutritionValues.fiber !== "N/A" ? nutritionValues.fiber + "g" : "N/A"}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <AppIcon name="sodium" size={16} tintColor="#607D8B" style={{ marginRight: 6 }} />
                            <Text style={styles.detailItem}>{t('results.sodium')}: {nutritionValues.sodium !== "N/A" ? nutritionValues.sodium + (nutritionValues.sodium.includes('mg') ? '' : 'g') : "N/A"}</Text>
                          </View>
                          <View style={styles.standardizedInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <AppIcon name="measuring_spoon" size={16} style={{ marginRight: 6 }} />
                              <Text style={styles.standardizedText}>
                                {t('results.valuesShownPer').replace('{grams}', servingGrams)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Log Meal Button */}
                      <TouchableOpacity 
                        style={[styles.logMealButton, savingMeal && { opacity: 0.6 }]}
                        onPress={handleLogMeal}
                        disabled={savingMeal}
                      >
                        {savingMeal ? (

                          <ActivityIndicator color="#fff" />

                        ) : (

                          <Text style={styles.logMealButtonText}>
                            ✓ {t('results.logMeal')}
                          </Text>

                        )}
                      </TouchableOpacity>

                      {/* Scan Again Button */}
                      <TouchableOpacity 
                        style={[styles.navButton, { backgroundColor: '#666' }]}
                        onPress={() => navigation.goBack()}
                      >
                        <Text style={styles.navButtonText}>← {route.params?.fromMode === 'photo' ? t('scanner.takeAnotherPhoto') : t('scanner.scanAgain')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </GestureHandlerRootView>
      )}
      {/* Nutrient Info Modal */}
      <NutrientModal
        visible={showNutrientModal}
        nutrient={selectedNutrient}
        onClose={() => setShowNutrientModal(false)}
        t ={t}
      />
      {/* Allergen Warning Modal */}
      <AllergenWarningModal
        visible={showAllergenWarning}
        warnings={allergenWarnings}
        onCancel={() => {
          setShowAllergenWarning(false);
          navigation.goBack();
        }}
        onProceed={() => setShowAllergenWarning(false)}
        theme={theme}
      />

      <Modal
        visible={showWrongFoodModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nutrientModalContent}>
            <Text style={styles.modalTitle}>{t('results.wrongFood')}</Text>

            <TextInput
              style={styles.servingInput}
              value={wrongFoodInput}
              onChangeText={setWrongFoodInput}
              placeholder="Enter correct food name"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.logMealButton, { marginTop: 15 }]}
              onPress={async () => {
                if (!wrongFoodInput) return;

                const corrected = await searchFood(wrongFoodInput);
                if (!corrected) {
                  Alert.alert(t('results.notFound'));
                  return;
                }

                setShowWrongFoodModal(false);

                const n = corrected.nutrients || corrected.nutriments || {};

                // Convert USDA format to OpenFoodFacts format
                const convertedFood = {
                  product_name: corrected.name || corrected.product_name,
                  image_url: food.image_url,
                  nutriments: {
                    'energy-kcal_100g': n['energy-kcal'] || n['energy-kcal_100g'] || 0,
                    proteins_100g: n.proteins || n.proteins_100g || 0,
                    carbohydrates_100g: n.carbohydrates || n.carbohydrates_100g || 0,
                    fat_100g: n.fat || n.fat_100g || 0,
                    sodium_100g: n.sodium || n.sodium_100g || 0,
                    sugars_100g: n.sugar || n.sugars_100g || 0,
                    fiber_100g: n.fiber || n.fiber_100g || 0,
                  },
                  serving_quantity: 100,
                  detected_by_ai: false,
                  ai_detected_name: food.ai_detected_name,
                  nutrition_source: corrected.source,
                };

                navigation.replace('Result', {
                  food: convertedFood,
                  fromMode: 'photo',
                  topSuggestions: route.params?.topSuggestions || [],
                });
              }}
            >
              <Text style={styles.logMealButtonText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowWrongFoodModal(false)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: '#666' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {searchingFood && (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ color: '#fff', marginTop: 12, fontSize: 16 }}>
          Searching for food...
        </Text>
      </View>
    )}

      {/* Guest Upsell Sheet */}
      <GuestUpsellSheet
        visible={guestSheetVisible}
        onClose={() => setGuestSheetVisible(false)}
        message={t('guest.signUpToLog')}
      />

      {savingMeal && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1F9B39" />
            <Text style={{ marginTop: 12, fontSize: 15, color: '#333' }}>{t('results.savingMeal') || 'Saving meal...'}</Text>
          </View>
        </View>
      )}
        </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  resultBox: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  productHeaderVertical: {
    flexDirection: 'column',
  },
  productImage: {
    width: 120,
    height: 120,
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 15,
  },
  resultText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  servingCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  servingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  servingInput: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'white',
    color: '#000',
  },
  servingHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  calorieCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  calorieLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 15,
  },
  calorieValue: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  calorieUnit: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  percentageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValueSmall: {
    fontWeight: 'bold',
    color: '#333',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  macroUnit: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  expandButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  expandText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  detailItem: {
    fontSize: 15,
    color: '#333',
    marginVertical: 6,
  },
  standardizedInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  standardizedText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  logMealButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  logMealButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nutrientModalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  nutrientIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    color: '#666',
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  photoViewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoViewImage: {
    width: '100%',
    height: '100%',
  },
  macroBadgesContainer: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    maxWidth: '90%',
  },
  macroBadge: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
  },
  macroBadgeLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  macroBadgeValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  swipeHints: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  swipeHintText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
  switchViewButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  switchViewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoModeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 10,
  },
  photoModeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  swipeIndicator: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  swipeIndicatorLeft: {
    right: 40,
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  swipeIndicatorRight: {
    left: 40,
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  swipeIndicatorText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  swipeIndicatorLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
  },
  photoMealNameContainer: {
  position: 'absolute',
  top: 60,
  left: 20,
  right: 20,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  paddingHorizontal: 15,
  paddingVertical: 10,
  borderRadius: 10,
},
  photoMealName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});