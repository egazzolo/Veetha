import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Image, Modal, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Circle } from 'react-native-svg';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { useTheme } from '../utils/ThemeContext';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import AllergenWarningModal from '../components/AllergenWarningModal';
import { useLanguage } from '../utils/LanguageContext';
import { logMealLogged } from '../utils/analytics';

// ============================================
// CIRCULAR PROGRESS COMPONENT
// ============================================
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

// ============================================
// AUTO-SIZED TEXT COMPONENT
// ============================================
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

// ============================================
// NUTRIENT MODAL COMPONENT
// ============================================
function NutrientModal({ visible, nutrient, onClose, t }) {
  const nutrientInfo = {
    calories: {
      icon: '🔥',
      title: 'Calories',
      description: 'Unit of energy from food. Your body burns calories constantly - even while sleeping - to power your heart, lungs, brain, digestion, and movement.'
    },
    protein: {
      icon: '💪',
      title: 'Protein',
      description: 'Builds and repairs muscles, bones, and skin. Also makes enzymes and hormones. Helps you feel full longer after meals.'
    },
    carbs: {
      icon: '🌾',
      title: 'Carbohydrates',
      description: 'Your body\'s preferred fuel source, especially for your brain and during exercise. Includes sugars (quick energy), starches (sustained energy), and fiber (aids digestion).'
    },
    fat: {
      icon: '🥑',
      title: 'Fat',
      description: 'Essential for absorbing vitamins A, D, E, and K. Makes hormones, protects organs, and insulates your body. Provides long-lasting energy.'
    },
    sugar: {
      icon: '🍬',
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
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.nutrientModalContent}>
            <Text style={styles.nutrientIcon}>{info.icon}</Text>
            <Text style={styles.modalTitle}>{info.title}</Text>
            <Text style={styles.modalText}>{info.description}</Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>{t('results.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ============================================
// MAIN RESULT SCREEN
// ============================================
export default function ResultScreen({ route, navigation }) {
  const { food } = route.params;
  const { t } = useLanguage();
  const { refreshMeals } = useUser();
  const [servingGrams, setServingGrams] = useState(food.serving_quantity || 100);
  const [inputValue, setInputValue] = useState(String(food.serving_quantity || 100));
  const [showDetails, setShowDetails] = useState(false);
  const [showNutrientModal, setShowNutrientModal] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const [userRestrictions, setUserRestrictions] = useState(null);
  const [isLandscapeImage, setIsLandscapeImage] = useState(false);
  const [showAllergenWarning, setShowAllergenWarning] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [allergenWarnings, setAllergenWarnings] = useState([]);
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

  const nutritionValues = React.useMemo(() => {
      const calculateNutrition = (per100g, grams) => {
        if (per100g === undefined || per100g === null || per100g === "?") return "N/A";
        const value = (per100g * grams) / 100;
        
        // If value is very small, return in mg
        if (value < 0.1 && value > 0) {
          return `${(value * 1000).toFixed(0)}mg`;
        }
        
        return value.toFixed(1);
      };

    return {
      calories: calculateNutrition(food.nutriments?.["energy-kcal_100g"], servingGrams),
      protein: calculateNutrition(food.nutriments?.proteins_100g, servingGrams),
      carbs: calculateNutrition(
        food.nutriments?.carbohydrates_100g ?? food.nutriments?.sugars_100g, 
        servingGrams
      ),
      fat: calculateNutrition(food.nutriments?.fat_100g, servingGrams),
      fiber: calculateNutrition(food.nutriments?.fiber_100g, servingGrams),
      sugar: calculateNutrition(food.nutriments?.sugars_100g, servingGrams),
      sodium: calculateNutrition(food.nutriments?.sodium_100g, servingGrams),
    };
  }, [food.nutriments, servingGrams]);

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    try {
      setSavingMeal(true);

      Alert.alert(t('results.uploading'), t('results.pleaseWait'));
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please log in to save meals');
        navigation.navigate('Login');
        return;
      }

      // 📤 UPLOAD IMAGE TO SUPABASE STORAGE (NEW CODE)
      let imageUrl = food.image_url;
      
      if (food.image_url && food.image_url.startsWith('file://')) {
        try {
          console.log('📤 Uploading image to storage...');

          const uploadPromise = async () => {
           const response = await fetch(food.image_url);
            const blob = await response.blob();
            
            const fileName = `meal-${user.id}-${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('meal-images')
              .upload(fileName, blob, { contentType: 'image/jpeg' });
            
            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('meal-images')
                .getPublicUrl(fileName);
              return urlData.publicUrl;
            }
            throw uploadError;
          };
        
          // ADD TIMEOUT:
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout')), 10000) // 10 second timeout
          );
          
          imageUrl = await Promise.race([uploadPromise(), timeoutPromise]);
          console.log('✅ Image uploaded:', imageUrl);
        } catch (err) {
          console.error('❌ Upload failed, continuing without image:', err);
          imageUrl = null; // Continue without image rather than hanging
        }
      }
          
      // 💾 SAVE TO DATABASE (EXISTING CODE)
      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        barcode: food.code || food.barcode,
        product_name: food.product_name,
        serving_grams: servingGrams,
        calories: parseFloat(nutritionValues.calories) || 0,
        protein: parseFloat(nutritionValues.protein) || 0,
        carbs: parseFloat(nutritionValues.carbs) || 0,
        fat: parseFloat(nutritionValues.fat) || 0,
        fiber: parseFloat(nutritionValues.fiber) || 0,
        sugar: parseFloat(nutritionValues.sugar) || 0,
        sodium: parseFloat(nutritionValues.sodium) || 0,
        image_url: imageUrl, // ← Use uploaded URL
      });

      if (error) throw error;

      console.log('✅ Meal logged successfully');

    await logMealLogged({
      calories: parseFloat(nutritionValues.calories) || 0,
      protein: parseFloat(nutritionValues.protein) || 0,
      source: route.params?.fromMode === 'photo' ? 'photo' : 'barcode',
    });
      
      // Refresh meals list
      await refreshMeals();

      // Show success and navigate back to home
      alert(t('results.mealLogged'));
      navigation.navigate('Home');

    } catch (error) {
      console.error('Error logging meal:', error);
      alert('Failed to log meal: ' + error.message);
    } finally {
      setSavingMeal(false);
    }
  };

  // Swipe gesture for detailed view
  const detailedSwipeGesture = Gesture.Pan()
      .activeOffsetX([-10, 10])  // Only activate for horizontal movement
      .failOffsetY([-10, 10])    // Fail (allow ScrollView) for vertical movement
      .onUpdate((e) => {
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
          navigation.goBack();
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
            navigation.goBack();
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
                <Text style={styles.macroBadgeLabel}>🔥{t('results.caloriesInfo')}</Text>
                <Text style={styles.macroBadgeValue}>{nutritionValues.calories}</Text>
              </View>
              
              <View style={[styles.macroBadge, { backgroundColor: '#2196F3' }]}>
                <Text style={styles.macroBadgeLabel}>💪 {t('results.protein')}: </Text>
                <Text style={styles.macroBadgeValue}>{nutritionValues.protein}g</Text>
              </View>
              
              <View style={[styles.macroBadge, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.macroBadgeLabel}>🌾 {t('results.carbs')}: </Text>
                <Text style={styles.macroBadgeValue}>{nutritionValues.carbs}g</Text>
              </View>
              
              <View style={[styles.macroBadge, { backgroundColor: '#9C27B0' }]}>
                <Text style={styles.macroBadgeLabel}>🥑 {t('results.fat')}: </Text>
                <Text style={styles.macroBadgeValue}>{nutritionValues.fat}g</Text>
              </View>
            </View>

            {/* Swipe Hints */}
            <View style={styles.swipeHints}>
              <Text style={styles.swipeHintText}>← {t('results.swipeLeftDelete')}</Text>
              <Text style={styles.swipeHintText}>{t('results.swipeRightSave')} →</Text>
            </View>

            {/* Switch to Detailed Button */}
            <TouchableOpacity 
              style={styles.switchViewButton}
              onPress={() => setViewMode('detailed')}
            >
              <Text style={styles.switchViewButtonText}>📊 {t('results.detailedView')}</Text>
            </TouchableOpacity>
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
                  {food.image_url ? (
                    <View style={[styles.productHeader, isLandscapeImage && styles.productHeaderVertical]}>
                      <Image 
                        source={{ uri: food.image_url }} 
                        style={styles.productImage}
                        resizeMode="contain"
                        onLoad={(e) => {
                          const { width, height } = e.nativeEvent.source;
                          const aspectRatio = width / height;
                          setIsLandscapeImage(aspectRatio > 1);
                        }}
                      />
                      <Text style={styles.resultTitle}>{food.product_name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.resultTitle}>{food.product_name}</Text>
                  )}

                  {food.image_url && (
                    <TouchableOpacity 
                      style={styles.photoModeButton}
                      onPress={() => setViewMode('photo')}
                    >
                      <Text style={styles.photoModeButtonText}>📸 {t('results.photoView')}</Text>
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
                          <Text style={styles.logMealButtonText}>📸 {t('results.submitProduct')}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.logMealButton, { backgroundColor: '#2196F3' }]}
                          onPress={() => {
                            navigation.navigate('ManualEntry');
                          }}
                        >
                          <Text style={styles.logMealButtonText}>✏️ {t('results.enterManually')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.navButton, { backgroundColor: '#666' }]}
                          onPress={() => navigation.goBack()}
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
                          <Text style={styles.detailItem}>🍭 {t('results.sugar')}: {nutritionValues.sugar !== "N/A" ? nutritionValues.sugar + "g" : "N/A"}</Text>
                          <Text style={styles.detailItem}>🌾 {t('results.fiber')}: {nutritionValues.fiber !== "N/A" ? nutritionValues.fiber + "g" : "N/A"}</Text>
                          <Text style={styles.detailItem}>🧂 {t('results.sodium')}: {nutritionValues.sodium !== "N/A" ? nutritionValues.sodium + (nutritionValues.sodium.includes('mg') ? '' : 'g') : "N/A"}</Text>
                          <View style={styles.standardizedInfo}>
                            <Text style={styles.standardizedText}>
                              📏 {t('results.valuesShownPer').replace('{grams}', servingGrams)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Log Meal Button */}
                      <TouchableOpacity 
                        style={[styles.logMealButton, savingMeal && { opacity: 0.6 }]}
                        onPress={handleLogMeal}
                        disabled={savingMeal}
                      >
                        <Text style={styles.logMealButtonText}>
                          {savingMeal ? t('results.saving') : `✓ ${t('results.logMeal')}`}
                        </Text>
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
    top: '15%',
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