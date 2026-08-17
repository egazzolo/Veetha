import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import ImageCropPicker from 'react-native-image-crop-picker';
import GuestUpsellSheet from './GuestUpsellSheet';
import AppIcon from './AppIcon';
import { useTheme } from '../utils/ThemeContext';
import { usePremiumStatus } from '../utils/usePremiumStatus';
import { supabase } from '../utils/supabase';

export default function MealsList({
  theme,
  t,
  loading,
  onImageUpload,
  onCropped,
  meals,
  isToday,
  getDateLabel,
  copyYesterdaysMeals,
  copyingMeals,
  handleMealToggle,
  handleMealLongPress,
  toggledMeals,
  navigation,
  mealsListRef,
  isGuestMode,
  // NEW PROPS
  selectionMode,
  selectedMealIds,
  onToggleSelection,
  onCancelSelection,
  onConfirmDelete,
}) {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [guestSheetVisible, setGuestSheetVisible] = useState(false);
  const [postItView, setPostItView] = useState('whole'); // 'whole' or 'individual'
  const [listViewMode, setListViewModeState] = useState('grid'); // 'grid' or 'list'
  const [enlargedImage, setEnlargedImage] = useState(null);
  const { isDark } = useTheme();
  const { isPremium } = usePremiumStatus();

  // MealsList remounts on navigating away and back (Home isn't kept alive
  // like a typical tab screen here), which was resetting this choice back
  // to the 'grid' default every time -- persist it so it sticks.
  useEffect(() => {
    AsyncStorage.getItem('meals_list_view_mode').then((saved) => {
      if (saved === 'grid' || saved === 'list') {
        setListViewModeState(saved);
      }
    });
  }, []);

  const setListViewMode = (mode) => {
    setListViewModeState(mode);
    AsyncStorage.setItem('meals_list_view_mode', mode);
  };

  const formatSmallMacro = (value) => {
    const num = Number(value) || 0;
    if (num === 0) return '0';
    const abs = Math.abs(num);
    if (abs < 0.1) return num.toFixed(4);
    if (abs < 1) return num.toFixed(2);
    return num.toFixed(1);
  };

  const handleMealPress = (meal) => {
    // In selection mode, tap toggles checkbox instead of opening post-it
    if (selectionMode) {
      onToggleSelection(meal.id);
      return;
    }
    setSelectedMeal(meal);
  };

  const extractStoragePath = (url) => {
    if (!url || typeof url !== 'string') return null;
    const marker = '/meal-images/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  };

  const handleCropPhoto = async (meal, currentImageUrl) => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Cropping photos is available with Veetha Premium.');
      return;
    }
    if (!currentImageUrl) return;

    try {
      // Download remote photo locally first — the cropper is unreliable pointed straight at a remote URL
      const localUri = `${FileSystem.cacheDirectory}crop-source-${meal.id}.jpg`;
      await FileSystem.downloadAsync(currentImageUrl, localUri);

      // Downscale before handing to the cropper — full-res camera photos (12MP+) risk OOM
      // on lower-memory devices; same discipline already applied before AI vision calls.
      const resized = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const cropped = await ImageCropPicker.openCropper({
        path: resized.uri,
        width: 800,
        height: 800,
        freeStyleCropEnabled: true,
        cropperToolbarTitle: 'Crop Photo',
      });

      const base64 = await FileSystem.readAsStringAsync(cropped.path, { encoding: 'base64' });
      const fileName = `meal-${meal.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('meal-images')
        .upload(fileName, decode(base64), { contentType: 'image/jpeg' });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('meal-images')
        .getPublicUrl(fileName);
      const newUrl = publicUrlData?.publicUrl;

      const { error: updateError } = await supabase
        .from('meals')
        .update({ image_url: newUrl })
        .eq('id', meal.id);

      if (updateError) {
        Alert.alert('Update failed', updateError.message);
        return;
      }

      // Delete the old file now that the new one is confirmed uploaded and linked
      const oldPath = extractStoragePath(currentImageUrl);
      if (oldPath) {
        await supabase.storage.from('meal-images').remove([oldPath]);
      }

      if (onCropped) onCropped();
    } catch (err) {
      if (err.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', err.message || 'Cropping failed');
      }
    }
  };

  const closePostIt = () => {
    setSelectedMeal(null);
    setPostItView('whole');
  };

  const selectedCount = selectedMealIds?.size || 0;

  return (
    <View 
      ref={mealsListRef}
      onLayout={(event) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        if (mealsListRef.current && mealsListRef.current.measureInWindow) {
          mealsListRef.current.measureInWindow((wx, wy, w, h) => {
            if (mealsListRef.current) {
              mealsListRef.current.tutorialCoords = {
                top: wy,
                left: wx,
                width: w,
                height: h,
                borderRadius: 16
              };
            };
          });
        }
      }}
      style={[styles.mealsCard, { backgroundColor: theme.cardBackground }]}
    >
      <View style={styles.mealsHeader}>
        {selectionMode ? (
          // SELECTION MODE HEADER
          <>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {selectedCount} {t('home.mealsSelected')}
            </Text>
            <View style={styles.mealsHeaderButtons}>
              <TouchableOpacity
                style={[styles.copyMealsButton, { backgroundColor: theme.border }]}
                onPress={onCancelSelection}
              >
                <Text style={[styles.copyMealsButtonText, { color: theme.text }]}>
                  {t('home.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.copyMealsButton,
                  { backgroundColor: '#E53935', opacity: selectedCount === 0 ? 0.5 : 1 }
                ]}
                onPress={onConfirmDelete}
                disabled={selectedCount === 0}
              >
                <Text style={styles.copyMealsButtonText}>
                  {t('home.deleteSelected')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // NORMAL HEADER
          <>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {isToday() ? t('home.todaysMeals') : getDateLabel() + t('home.daysMeals')} ({meals.length})
            </Text>
            
            {isToday() && (
              <View style={styles.mealsHeaderButtons}>
                <TouchableOpacity
                  style={[styles.copyMealsButton, { backgroundColor: theme.primary }]}
                  onPress={copyYesterdaysMeals}
                  disabled={copyingMeals}
                >
                  <Text style={styles.copyMealsButtonText}>
                    {copyingMeals ? '...' : t('home.copyYesterday')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.quickEntryButton, { backgroundColor: '#2196F3' }]}
                  onPress={() => {
                    if (isGuestMode) {
                      setGuestSheetVisible(true);
                      return;
                    }
                    navigation.navigate('QuickEntry');
                  }}
                >
                  <Text style={styles.quickEntryButtonText}>
                    {t('home.quickEntry')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickEntryButton, { backgroundColor: theme.border }]}
                  onPress={() => setListViewMode(listViewMode === 'grid' ? 'list' : 'grid')}
                >
                  <Text style={[styles.quickEntryButtonText, { color: theme.text }]}>
                    {listViewMode === 'grid' ? '☰' : '▦'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {loading ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('home.loading')}</Text>
      ) : meals.length === 0 ? (
        <View style={styles.emptyState}>
          <AppIcon name="plate" size={48} tintColor={theme.textSecondary} style={{ marginBottom: 10 }} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('home.noMealsYet')}
          </Text>
          <Text style={[styles.emptyHint, { color: theme.textTertiary }]}>
            {t('home.addFirstMeal')}
          </Text>
        </View>
      ) : (
        meals.map((meal) => {
          const product = meal.product;
          if (!product) return null;
          
          const actualCalories = (product.calories * meal.serving_grams) / 100;
          const actualProtein = (product.protein * meal.serving_grams) / 100;
          const actualCarbs = (product.carbs * meal.serving_grams) / 100;
          const actualFat = (product.fat * meal.serving_grams) / 100;
          const actualSodium = (product.sodium * meal.serving_grams) / 100;
          const actualSugar = (product.sugar * meal.serving_grams) / 100;
          const actualFiber = (product.fiber * meal.serving_grams) / 100;

          const isSelected = selectionMode && selectedMealIds?.has(meal.id);

          if (listViewMode === 'list') {
            return (
              <TouchableOpacity
                key={meal.id}
                style={[
                  styles.mealRowCompact,
                  { backgroundColor: theme.cardBackground },
                  isSelected && { borderWidth: 2, borderColor: '#E53935' },
                ]}
                onPress={() => handleMealPress({
                  ...meal,
                  product_name: product.name,
                  calories: actualCalories,
                  protein: actualProtein,
                  carbs: actualCarbs,
                  fat: actualFat,
                  sodium: actualSodium,
                  sugar: actualSugar,
                  fiber: actualFiber,
                  serving_unit: product.serving_unit,
                })}
                onLongPress={() => {
                  if (selectionMode) return;
                  handleMealLongPress({
                    ...meal,
                    product_name: meal.product?.name ?? meal.product_name,
                    calories: meal.product?.calories ?? meal.calories,
                    protein: meal.product?.protein ?? meal.protein,
                    carbs: meal.product?.carbs ?? meal.carbs,
                    fat: meal.product?.fat ?? meal.fat,
                  });
                }}
                activeOpacity={0.7}
              >
                {selectionMode && (
                  <View style={[
                    styles.checkboxOverlayCompact,
                    isSelected && { backgroundColor: '#E53935', borderColor: '#E53935' },
                  ]}>
                    {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.thumbSectionCompact}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (!meal.image_url && !product.image_url) {
                      if (onImageUpload) onImageUpload(meal);
                    } else {
                      setEnlargedImage(meal.image_url || product.image_url);
                    }
                  }}
                >
                  {(meal.image_url || product.image_url) ? (
                    <Image
                      source={{ uri: meal.image_url || product.image_url }}
                      style={styles.thumbImageCompact}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbPlaceholderCompact}>
                      <Text style={styles.thumbEmojiCompact}>{product.emoji || '🍽️'}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text
                  style={[styles.productNameCompact, { color: theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {product.name}
                </Text>

                <View style={styles.caloriesInlineCompact}>
                  <Text style={styles.caloriesNumberCompact}>{Math.round(actualCalories)}</Text>
                  <Text style={styles.caloriesLabelCompact}>{t('home.kcal')}</Text>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={meal.id}
              style={[
                styles.mealCard,
                { backgroundColor: theme.cardBackground },
                isSelected && { borderWidth: 2, borderColor: '#E53935' },
              ]}
              onPress={() => handleMealPress({
                ...meal,
                product_name: product.name,
                calories: actualCalories,
                protein: actualProtein,
                carbs: actualCarbs,
                fat: actualFat,
                sodium: actualSodium,
                sugar: actualSugar,
                fiber: actualFiber,
                serving_unit: product.serving_unit,
              })}
              onLongPress={() => {
                if (selectionMode) return;
                handleMealLongPress({
                  ...meal,
                  product_name: meal.product?.name ?? meal.product_name,
                  calories: meal.product?.calories ?? meal.calories,
                  protein: meal.product?.protein ?? meal.protein,
                  carbs: meal.product?.carbs ?? meal.carbs,
                  fat: meal.product?.fat ?? meal.fat,
                });
              }}
              activeOpacity={0.7}
            >
              {/* Checkbox overlay in selection mode */}
              {selectionMode && (
                <View style={[
                  styles.checkboxOverlay,
                  isSelected && { backgroundColor: '#E53935', borderColor: '#E53935' },
                ]}>
                  {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
              )}

              {/* Title row */}
              <View style={styles.titleRow}>
                <Text
                  style={[styles.productNameBig, { color: theme.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {product.name}
                </Text>
                <View style={styles.titleRight}>
                  <Text style={[styles.servingSizeBig, { color: theme.textTertiary }]}>
                    {meal.serving_grams}{product.serving_unit}
                  </Text>
                  <View style={styles.caloriesInline}>
                    <Text style={styles.caloriesNumberBig}>{Math.round(actualCalories)}</Text>
                    <Text style={styles.caloriesLabelBig}>{t('home.kcal')}</Text>
                  </View>
                </View>
              </View>

              {/* Big food photo */}
              <TouchableOpacity
                style={styles.imageSectionBig}
                onPress={() => {
                  // If no image, upload. If image exists, behave like the card (open post-it OR toggle selection)
                  if (!meal.image_url && !product.image_url && onImageUpload) {
                    onImageUpload(meal);
                  } else {
                    handleMealPress({
                      ...meal,
                      product_name: product.name,
                      calories: actualCalories,
                      protein: actualProtein,
                      carbs: actualCarbs,
                      fat: actualFat,
                      sodium: actualSodium,
                      sugar: actualSugar,
                      fiber: actualFiber,
                      serving_unit: product.serving_unit,
                    });
                  }
                }}
                onLongPress={() => {
                  if (selectionMode) return;
                  handleMealLongPress({
                    ...meal,
                    product_name: meal.product?.name ?? meal.product_name,
                    calories: meal.product?.calories ?? meal.calories,
                    protein: meal.product?.protein ?? meal.protein,
                    carbs: meal.product?.carbs ?? meal.carbs,
                    fat: meal.product?.fat ?? meal.fat,
                  });
                }}
                activeOpacity={0.7}
              >
                {(meal.image_url || product.image_url) ? (
                  <Image
                    source={{ uri: meal.image_url || product.image_url }}
                    style={styles.mealImageBig}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImageBig}>
                    <Text style={styles.placeholderEmojiBig}>{product.emoji || '🍽️'}</Text>
                    <Text style={styles.uploadHintBig}>+ Add Photo</Text>
                  </View>
                )}

                {false && !selectionMode && isPremium && (meal.image_url || product.image_url) && (
                  <TouchableOpacity
                    style={styles.cropIconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCropPhoto(meal, meal.image_url || product.image_url);
                    }}
                  >
                    <AppIcon name="crop" size={18} tintColor="#fff" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Macros row at bottom */}
              <View style={styles.macrosRowBottom}>
                <View style={styles.macroChip}>
                  <AppIcon name="protein" size={14} tintColor="#A0522D" style={{ marginRight: 3 }} />
                  <Text style={[styles.macroChipText, { color: '#A0522D' }]}>{Math.round(actualProtein)}g</Text>
                </View>
                <View style={styles.macroChip}>
                  <AppIcon name="carbs" size={14} tintColor="#DAA520" style={{ marginRight: 3 }} />
                  <Text style={[styles.macroChipText, { color: '#DAA520' }]}>{Math.round(actualCarbs)}g</Text>
                </View>
                <View style={styles.macroChip}>
                  <AppIcon name="fat" size={14} tintColor="#1F9B39" style={{ marginRight: 3 }} />
                  <Text style={[styles.macroChipText, { color: '#1F9B39' }]}>{Math.round(actualFat)}g</Text>
                </View>
                <View style={styles.macroChip}>
                  <AppIcon name="sodium" size={14} tintColor="#607D8B" style={{ marginRight: 3 }} />
                  <Text style={[styles.macroChipText, { color: '#607D8B' }]}>{formatSmallMacro(actualSodium)}g</Text>
                </View>
                <View style={styles.macroChip}>
                  <AppIcon name="sugar" size={14} tintColor="#E91E63" style={{ marginRight: 3 }} />
                  <Text style={[styles.macroChipText, { color: '#E91E63' }]}>{formatSmallMacro(actualSugar)}g</Text>
                </View>
                <View style={styles.macroChip}>
                  <AppIcon name="fiber" size={14} tintColor="#4CAF50" style={{ marginRight: 3 }} />
                  <Text style={[styles.macroChipText, { color: '#4CAF50' }]}>{formatSmallMacro(actualFiber)}g</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <GuestUpsellSheet
        visible={guestSheetVisible}
        onClose={() => setGuestSheetVisible(false)}
        message={t('guest.signUpToLog')}
      />

      {/* Post-it Note Modal */}
      <Modal
        visible={selectedMeal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closePostIt}
      >
        <Pressable style={styles.modalOverlay} onPress={closePostIt}>
          <Pressable style={styles.postItContainer} onPress={(e) => e.stopPropagation()}>
            <View style={[
              styles.postIt,
              isDark && {
                backgroundColor: '#3D2E00',
                borderTopColor: '#5C4400',
              }
            ]}>
              {/* Toggle button — only shown when meal has 2+ individual foods */}
              {selectedMeal?.individual_foods && selectedMeal.individual_foods.length > 1 && (
                <View style={styles.postItToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.postItToggleBtn,
                      postItView === 'whole' && styles.postItToggleBtnActive,
                    ]}
                    onPress={() => setPostItView('whole')}
                  >
                    <Text style={[
                      styles.postItToggleText,
                      postItView === 'whole' && styles.postItToggleTextActive,
                    ]}>
                      Whole meal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.postItToggleBtn,
                      postItView === 'individual' && styles.postItToggleBtnActive,
                      !isPremium && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      if (!isPremium) {
                        Alert.alert('Premium Feature', 'Individual food breakdown is available with Veetha Premium.');
                        return;
                      }
                      setPostItView('individual');
                    }}
                  >
                    <Text style={[
                      styles.postItToggleText,
                      postItView === 'individual' && styles.postItToggleTextActive,
                    ]}>
                      Individual foods{!isPremium ? ' 🔒' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* WHOLE MEAL VIEW (default) */}
              {postItView === 'whole' && (
                <>
                  <View style={styles.postItHeader}>
                    <Text style={[
                      styles.postItTitle,
                      isDark && { color: '#F5E6A3' }
                    ]} numberOfLines={2}>
                      {selectedMeal?.product_name}
                    </Text>
                  </View>
                  <View style={styles.postItCalories}>
                    <Text style={[
                      styles.postItCaloriesText,
                      isDark && { color: '#7BC97F' }
                    ]}>
                      {Math.round(selectedMeal?.calories || 0)} kcal
                    </Text>
                  </View>
                  <View style={styles.postItDivider} />
                  <View style={styles.postItMacros}>
                    <View style={styles.postItMacroRow}>
                      <AppIcon name="protein" size={16} tintColor="#A0522D" style={{ marginRight: 4 }} />
                        <Text style={[styles.postItMacroLabel, isDark && { color: '#F5E6A3' }]}>{t('home.mealsList.protein')}:</Text>
                      <Text style={[styles.postItMacroValue, isDark && { color: '#F5E6A3' }]}>{Math.round(selectedMeal?.protein || 0)}g</Text>
                    </View>
                    <View style={styles.postItMacroRow}>
                      <AppIcon name="carbs" size={16} tintColor="#DAA520" style={{ marginRight: 4 }} />
                        <Text style={[styles.postItMacroLabel, isDark && { color: '#F5E6A3' }]}>{t('home.mealsList.carbs')}:</Text>
                      <Text style={[styles.postItMacroValue, isDark && { color: '#F5E6A3' }]}>{Math.round(selectedMeal?.carbs || 0)}g</Text>
                    </View>
                    <View style={styles.postItMacroRow}>
                      <AppIcon name="fat" size={16} tintColor="#1F9B39" style={{ marginRight: 4 }} />
                        <Text style={[styles.postItMacroLabel, isDark && { color: '#F5E6A3' }]}>{t('home.mealsList.fat')}:</Text>
                      <Text style={[styles.postItMacroValue, isDark && { color: '#F5E6A3' }]}>{Math.round(selectedMeal?.fat || 0)}g</Text>
                    </View>
                    <View style={styles.postItMacroRow}>
                      <AppIcon name="sodium" size={16} tintColor="#607D8B" style={{ marginRight: 4 }} />
                        <Text style={[styles.postItMacroLabel, isDark && { color: '#F5E6A3' }]}>{t('home.mealsList.sodium')}:</Text>
                      <Text style={[styles.postItMacroValue, isDark && { color: '#F5E6A3' }]}>{formatSmallMacro(selectedMeal?.sodium || 0)}g</Text>
                    </View>
                    <View style={styles.postItMacroRow}>
                      <AppIcon name="sugar" size={16} tintColor="#E91E63" style={{ marginRight: 4 }} />
                        <Text style={[styles.postItMacroLabel, isDark && { color: '#F5E6A3' }]}>{t('home.mealsList.sugar')}:</Text>
                      <Text style={[styles.postItMacroValue, isDark && { color: '#F5E6A3' }]}>{formatSmallMacro(selectedMeal?.sugar || 0)}g</Text>
                    </View>
                    <View style={styles.postItMacroRow}>
                      <AppIcon name="fiber" size={16} tintColor="#4CAF50" style={{ marginRight: 4 }} />
                        <Text style={[styles.postItMacroLabel, isDark && { color: '#F5E6A3' }]}>{t('home.mealsList.fiber')}:</Text>
                      <Text style={[styles.postItMacroValue, isDark && { color: '#F5E6A3' }]}>{formatSmallMacro(selectedMeal?.fiber || 0)}g</Text>
                    </View>
                  </View>
                  <View style={styles.postItFooter}>
                    <Text style={[styles.postItServingText, isDark && { color: '#C9A961' }]}>
                      {t('home.mealsList.serving')}: {selectedMeal?.serving_grams}{selectedMeal?.serving_unit || 'g'}
                    </Text>
                  </View>
                </>
              )}

              {/* INDIVIDUAL FOODS VIEW */}
              {postItView === 'individual' && selectedMeal?.individual_foods && (
                <View style={{ paddingTop: 4 }}>
                  {selectedMeal.individual_foods.map((food, index) => {
                    const grams = food.typical_serving_grams || 100;
                    const fCals = Math.round((food.calories_per_100g || 0) * grams / 100);
                    const fProt = Math.round((food.protein_per_100g || 0) * grams / 100);
                    const fCarb = Math.round((food.carbs_per_100g || 0) * grams / 100);
                    const fFat = Math.round((food.fat_per_100g || 0) * grams / 100);
                    const fSugar = formatSmallMacro((food.sugar_per_100g || 0) * grams / 100);
                    const fFiber = formatSmallMacro((food.fiber_per_100g || 0) * grams / 100);
                    const fSodium = formatSmallMacro((food.sodium_per_100g || 0) * grams / 100);
                    return (
                      <View key={index} style={{
                        marginBottom: 12,
                        paddingBottom: 10,
                        borderBottomWidth: index < selectedMeal.individual_foods.length - 1 ? 1 : 0,
                        borderBottomColor: isDark ? '#5C4400' : '#D4C100',
                      }}>
                        <Text style={[
                          styles.postItTitle,
                          { fontSize: 15, marginBottom: 4, textTransform: 'capitalize' },
                          isDark && { color: '#F5E6A3' }
                        ]}>
                          {food.food_name}
                        </Text>
                        <Text style={[
                          styles.postItCaloriesText,
                          { fontSize: 18, marginBottom: 6 },
                          isDark && { color: '#7BC97F' }
                        ]}>
                          {fCals} kcal
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                          <View style={styles.postItMacroRow}>
                            <AppIcon name="protein" size={13} tintColor="#A0522D" style={{ marginRight: 3 }} />
                            <Text style={[{ fontSize: 12, fontWeight: '600', fontFamily: 'Courier' }, isDark && { color: '#F5E6A3' }, !isDark && { color: '#1a1a1a' }]}>{fProt}g</Text>
                          </View>
                          <View style={styles.postItMacroRow}>
                            <AppIcon name="carbs" size={13} tintColor="#DAA520" style={{ marginRight: 3 }} />
                            <Text style={[{ fontSize: 12, fontWeight: '600', fontFamily: 'Courier' }, isDark && { color: '#F5E6A3' }, !isDark && { color: '#1a1a1a' }]}>{fCarb}g</Text>
                          </View>
                          <View style={styles.postItMacroRow}>
                            <AppIcon name="fat" size={13} tintColor="#1F9B39" style={{ marginRight: 3 }} />
                            <Text style={[{ fontSize: 12, fontWeight: '600', fontFamily: 'Courier' }, isDark && { color: '#F5E6A3' }, !isDark && { color: '#1a1a1a' }]}>{fFat}g</Text>
                          </View>
                          <View style={styles.postItMacroRow}>
                            <AppIcon name="sugar" size={13} tintColor="#E91E63" style={{ marginRight: 3 }} />
                            <Text style={[{ fontSize: 12, fontWeight: '600', fontFamily: 'Courier' }, isDark && { color: '#F5E6A3' }, !isDark && { color: '#1a1a1a' }]}>{fSugar}g</Text>
                          </View>
                          <View style={styles.postItMacroRow}>
                            <AppIcon name="fiber" size={13} tintColor="#4CAF50" style={{ marginRight: 3 }} />
                            <Text style={[{ fontSize: 12, fontWeight: '600', fontFamily: 'Courier' }, isDark && { color: '#F5E6A3' }, !isDark && { color: '#1a1a1a' }]}>{fFiber}g</Text>
                          </View>
                          <View style={styles.postItMacroRow}>
                            <AppIcon name="sodium" size={13} tintColor="#607D8B" style={{ marginRight: 3 }} />
                            <Text style={[{ fontSize: 12, fontWeight: '600', fontFamily: 'Courier' }, isDark && { color: '#F5E6A3' }, !isDark && { color: '#1a1a1a' }]}>{fSodium}g</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Enlarged photo modal — list mode thumbnail tap */}
      <Modal
        visible={enlargedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEnlargedImage(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEnlargedImage(null)}>
          <Image
            source={{ uri: enlargedImage }}
            style={styles.enlargedImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mealsCard: {
    // Full-bleed, not an inset rounded card -- so this reads as the page's
    // own background changing color starting at "Today's Meals," not a
    // floating card sitting on top of it.
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  mealsHeader: { 
    marginBottom: 15 
  },
  mealsHeaderButtons: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 12 
  },
  copyMealsButton: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  copyMealsButtonText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  quickEntryButton: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  quickEntryButtonText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 30 
  },
  emptyIcon: { 
    fontSize: 48, 
    marginBottom: 10 
  },
  emptyText: { 
    fontSize: 16, 
    marginBottom: 5 
  },
  emptyHint: { 
    fontSize: 13, 
    textAlign: 'center' 
  },
  mealItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 8, 
    borderRadius: 12, 
    marginBottom: 10 
  },
  mealCard: {
    padding: 12,
    marginBottom: 14,
    borderRadius: 16,
    position: 'relative',
  },
  checkboxOverlay: { 
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    borderWidth: 2, 
    borderColor: '#999', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  productNameBig: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    lineHeight: 21,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  servingSizeBig: {
    fontSize: 13,
    fontWeight: '500',
  },
  caloriesInline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  caloriesNumberBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4CAF50',
  },
  caloriesLabelBig: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  imageSectionBig: {
    width: '100%',
    minHeight: 220,
    maxHeight: 320,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  cropIconButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  mealImageBig: {
    width: '100%',
    height: '100%',
    minHeight: 220,
  },
  placeholderImageBig: {
    width: '100%',
    height: 220,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  placeholderEmojiBig: {
    fontSize: 64,
  },
  uploadHintBig: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    fontWeight: '500',
  },
  macrosRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  macroChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkboxTick: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  imageSection: { 
    width: '30%', 
    aspectRatio: 1, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  mealImage: { 
    width: '100%', 
    height: '100%' 
  },
  placeholderImage: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 12 
  },
  placeholderEmoji: { 
    fontSize: 40 
  },
  uploadHint: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  infoSection: { 
    width: '42%', 
    paddingHorizontal: 6, 
    justifyContent: 'center', 
    gap: 2 
  },
  productName: { 
    fontSize: 14, 
    fontWeight: '600', 
    lineHeight: 16 
  },
  servingSize: { 
    fontSize: 11, 
    fontWeight: '500', 
    marginBottom: 2 
  },
  macrosContainer: { 
    flexDirection: 'row', 
    gap: 6, 
    flexWrap: 'wrap', 
    marginTop: 2 
  },
  macroRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 2 
  },
  macroEmoji: { 
    fontSize: 11 
  },
  caloriesSection: { 
    width: '28%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 4 
  },
  caloriesNumber: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#4CAF50' 
  },
  caloriesLabel: { 
    fontSize: 11, 
    color: '#999', 
    marginTop: 2 
  },
  proteinText: { 
    fontSize: 11, 
    color: '#2196F3', 
    fontWeight: '600' 
  },
  carbsText: { 
    fontSize: 11, 
    color: '#FF9800', 
    fontWeight: '600' 
  },
  fatText: { 
    fontSize: 11, 
    color: '#9C27B0', 
    fontWeight: '600' 
  },
  sodiumText: { 
    fontSize: 11, 
    color: '#E91E63', 
    fontWeight: '600' 
  },
  sugarText: { 
    fontSize: 11, 
    color: '#00BCD4', 
    fontWeight: '600' 
  },
  fiberText: { 
    fontSize: 11, 
    color: '#4CAF50', 
    fontWeight: '600' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  postItContainer: { 
    transform: [{ rotate: '-1deg' }] 
  },
  postIt: { 
    backgroundColor: '#FFEB3B', 
    width: 280, 
    minHeight: 320, 
    padding: 20, 
    borderRadius: 2, 
    shadowColor: '#000', 
    shadowOffset: { 
      width: 2, 
      height: 4 
    }, 
    shadowOpacity: 0.3, 
    shadowRadius: 6, 
    elevation: 8, 
    borderTopWidth: 20, 
    borderTopColor: '#FDD835' 
  },
  postItHeader: { 
    marginBottom: 12 
  },
  postItTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1a1a1a', 
    fontFamily: 'Courier' 
  },
  postItCalories: { 
    marginBottom: 8 
  },
  postItCaloriesText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2E7D32', 
    fontFamily: 'Courier' 
  },
  postItDivider: { 
    height: 1, 
    backgroundColor: '#D4C100', 
    marginVertical: 12 
  },
  postItMacros: { 
    gap: 8 
  },
  postItMacroRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  postItMacroEmoji: { 
    fontSize: 16, 
    width: 20 
  },
  postItMacroLabel: { 
    fontSize: 14, 
    color: '#1a1a1a', 
    fontWeight: '600', 
    flex: 1, 
    fontFamily: 'Courier' 
  },
  postItMacroValue: { 
    fontSize: 14, 
    color: '#1a1a1a', 
    fontWeight: 'bold', 
    fontFamily: 'Courier' 
  },
  postItFooter: { 
    marginTop: 16, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#D4C100' 
  },
  postItServingText: { 
    fontSize: 12, 
    color: '#4a4a4a', 
    fontStyle: 'italic', 
    fontFamily: 'Courier' 
  },
  postItToggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    marginTop: -4,
  },
  postItToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D4C100',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  postItToggleBtnActive: {
    backgroundColor: '#1F9B39',
    borderColor: '#1F9B39',
  },
  postItToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Courier',
  },
  postItToggleTextActive: {
    color: '#fff',
  },
  mealRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    position: 'relative',
    gap: 12,
  },
  checkboxOverlayCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  thumbSectionCompact: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbImageCompact: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholderCompact: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbEmojiCompact: {
    fontSize: 22,
  },
  productNameCompact: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  caloriesInlineCompact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  caloriesNumberCompact: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4CAF50',
  },
  caloriesLabelCompact: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  enlargedImage: {
    width: '90%',
    height: '70%',
  },
});