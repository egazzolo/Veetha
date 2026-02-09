import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, Pressable } from 'react-native';

export default function MealsList({
  theme,
  t,
  loading,
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
}) {
  const [selectedMeal, setSelectedMeal] = useState(null);

  const handleMealPress = (meal) => {
    setSelectedMeal(meal);
  };

  const closePostIt = () => {
    setSelectedMeal(null);
  };

  return (
    <View 
      ref={mealsListRef}
      onLayout={(event) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        if (mealsListRef.current && mealsListRef.current.measureInWindow) {
          mealsListRef.current.measureInWindow((wx, wy, w, h) => {
            mealsListRef.current.tutorialCoords = {
              top: wy,
              left: wx,
              width: w,
              height: h,
              borderRadius: 16
            };
          });
        }
      }}
      style={[styles.mealsCard, { backgroundColor: theme.cardBackground }]}
    >
        <View style={styles.mealsHeader}>
                {/* Title - Always on top */}
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                {isToday() ? t('home.todaysMeals') : getDateLabel() + t('home.daysMeals')} ({meals.length})
                </Text>
                
                {/* Buttons - Below title (only show for today) */}
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
                    onPress={() => navigation.navigate('QuickEntry')}
                    >
                    <Text style={styles.quickEntryButtonText}>
                       {t('home.quickEntry')}
                    </Text>
                    </TouchableOpacity>
                </View>
                )}
            </View>

      {loading ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('home.loading')}</Text>
      ) : meals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🍽️</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('home.noMealsYet')}
          </Text>
          <Text style={[styles.emptyHint, { color: theme.textTertiary }]}>
            {t('home.addFirstMeal')}
          </Text>
        </View>
      ) : (
        meals.map((meal) => {
          // Calculate actual nutrition based on serving size
          const product = meal.product;
          if (!product) return null; // Skip if product was deleted
          
          const actualCalories = (product.calories * meal.serving_grams) / 100;
          const actualProtein = (product.protein * meal.serving_grams) / 100;
          const actualCarbs = (product.carbs * meal.serving_grams) / 100;
          const actualFat = (product.fat * meal.serving_grams) / 100;
          const actualSodium = (product.sodium * meal.serving_grams) / 100;
          const actualSugar = (product.sugar * meal.serving_grams) / 100;
          const actualFiber = (product.fiber * meal.serving_grams) / 100;
          
          return (
            <TouchableOpacity
              key={meal.id}
              style={[styles.mealCard, { backgroundColor: theme.cardBackground }]}
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
              onLongPress={() => handleMealLongPress(meal)}
              activeOpacity={0.7}
            >
              {/* Image Section */}
              <View style={styles.imageSection}>
                {meal.image_url || product.image_url ? (
                  <Image 
                    source={{ uri: meal.image_url || product.image_url }} 
                    style={styles.mealImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderEmoji}>🍽️</Text>
                  </View>
                )}
              </View>

              {/* Product Name & Macros Section */}
              <View style={styles.infoSection}>
                <Text 
                  style={[styles.productName, { color: theme.text }]} 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {product.name}
                </Text>
                
                <Text style={[styles.servingSize, { color: theme.textTertiary }]}>
                  {meal.serving_grams}{product.serving_unit}
                </Text>
                
                {/* Primary macros */}
                <View style={styles.macrosContainer}>
                  <View style={styles.macroRow}>
                    <Text style={styles.macroEmoji}>💪</Text>
                    <Text style={styles.proteinText}>
                      {Math.round(actualProtein)}g
                    </Text>
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={styles.macroEmoji}>🌾</Text>
                    <Text style={styles.carbsText}>
                      {Math.round(actualCarbs)}g
                    </Text>
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={styles.macroEmoji}>🥑</Text>
                    <Text style={styles.fatText}>
                      {Math.round(actualFat)}g
                    </Text>
                  </View>
                </View>

                {/* Secondary macros */}
                <View style={styles.macrosContainer}>
                  <View style={styles.macroRow}>
                    <Text style={styles.macroEmoji}>🧂</Text>
                    <Text style={styles.sodiumText}>
                      {Math.round(actualSodium)}mg
                    </Text>
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={styles.macroEmoji}>🍬</Text>
                    <Text style={styles.sugarText}>
                      {Math.round(actualSugar)}g
                    </Text>
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={styles.macroEmoji}>🌿</Text>
                    <Text style={styles.fiberText}>
                      {Math.round(actualFiber)}g
                    </Text>
                  </View>
                </View>
              </View>

              {/* Calories Section */}
              <View style={styles.caloriesSection}>
                <Text style={styles.caloriesNumber}>
                  {Math.round(actualCalories)}
                </Text>
                <Text style={styles.caloriesLabel}>{t('home.kcal')}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Post-it Note Modal */}
      <Modal
        visible={selectedMeal !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closePostIt}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={closePostIt}
        >
          <Pressable 
            style={styles.postItContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.postIt}>
              {/* Post-it Header */}
              <View style={styles.postItHeader}>
                <Text style={styles.postItTitle} numberOfLines={2}>
                  {selectedMeal?.product_name}
                </Text>
              </View>

              {/* Calories */}
              <View style={styles.postItCalories}>
                <Text style={styles.postItCaloriesText}>
                  {Math.round(selectedMeal?.calories || 0)} kcal
                </Text>
              </View>

              {/* Divider line */}
              <View style={styles.postItDivider} />

              {/* Macros */}
              <View style={styles.postItMacros}>
                <View style={styles.postItMacroRow}>
                  <Text style={styles.postItMacroEmoji}>💪</Text>
                  <Text style={styles.postItMacroLabel}>{t('home.mealsList.protein')}:</Text>
                  <Text style={styles.postItMacroValue}>
                    {Math.round(selectedMeal?.protein || 0)}g
                  </Text>
                </View>

                <View style={styles.postItMacroRow}>
                  <Text style={styles.postItMacroEmoji}>🌾</Text>
                  <Text style={styles.postItMacroLabel}>{t('home.mealsList.carbs')}:</Text>
                  <Text style={styles.postItMacroValue}>
                    {Math.round(selectedMeal?.carbs || 0)}g
                  </Text>
                </View>

                <View style={styles.postItMacroRow}>
                  <Text style={styles.postItMacroEmoji}>🥑</Text>
                  <Text style={styles.postItMacroLabel}>{t('home.mealsList.fat')}:</Text>
                  <Text style={styles.postItMacroValue}>
                    {Math.round(selectedMeal?.fat || 0)}g
                  </Text>
                </View>

                <View style={styles.postItMacroRow}>
                  <Text style={styles.postItMacroEmoji}>🧂</Text>
                  <Text style={styles.postItMacroLabel}>{t('home.mealsList.sodium')}:</Text>
                  <Text style={styles.postItMacroValue}>
                    {Math.round(selectedMeal?.sodium || 0)}mg
                  </Text>
                </View>

                <View style={styles.postItMacroRow}>
                  <Text style={styles.postItMacroEmoji}>🍬</Text>
                  <Text style={styles.postItMacroLabel}>{t('home.mealsList.sugar')}:</Text>
                  <Text style={styles.postItMacroValue}>
                    {Math.round(selectedMeal?.sugar || 0)}g
                  </Text>
                </View>

                <View style={styles.postItMacroRow}>
                  <Text style={styles.postItMacroEmoji}>🌿</Text>
                  <Text style={styles.postItMacroLabel}>{t('home.mealsList.fiber')}:</Text>
                  <Text style={styles.postItMacroValue}>
                    {Math.round(selectedMeal?.fiber || 0)}g
                  </Text>
                </View>
              </View>

              {/* Serving size footer */}
              <View style={styles.postItFooter}>
                <Text style={styles.postItServingText}>
                  {t('home.mealsList.serving')}: {selectedMeal?.serving_grams}{selectedMeal?.serving_unit || 'g'}
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mealsCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  mealsHeader: {
    marginBottom: 15,
  },
  mealsHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  copyMealsButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyMealsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickEntryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickEntryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 5,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  mealCard: {
    flexDirection: 'row',
    padding: 8,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    paddingLeft: 4,
  },
  imageSection: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  infoSection: {
    width: '42%',
    paddingHorizontal: 6,
    justifyContent: 'center',
    gap: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  servingSize: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  macroEmoji: {
    fontSize: 11,
  },
  caloriesSection: {
    width: '28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  caloriesNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  caloriesLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  proteinText: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '600',
  },
  carbsText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
  },
  fatText: {
    fontSize: 11,
    color: '#9C27B0',
    fontWeight: '600',
  },
  sodiumText: {
    fontSize: 11,
    color: '#E91E63',
    fontWeight: '600',
  },
  sugarText: {
    fontSize: 11,
    color: '#00BCD4',
    fontWeight: '600',
  },
  fiberText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  mealImagePlaceholderText: {
    fontSize: 45,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  mealGrams: {
    fontSize: 12,
    color: '#c4b2b2ff',
  },
  macroDot: {
    fontSize: 12,
    color: '#999',
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Post-it Note Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postItContainer: {
    transform: [{ rotate: '-1deg' }],
  },
  postIt: {
    backgroundColor: '#FFEB3B',
    width: 280,
    minHeight: 320,
    padding: 20,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderTopWidth: 20,
    borderTopColor: '#FDD835',
  },
  postItHeader: {
    marginBottom: 12,
  },
  postItTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontFamily: 'Courier',
  },
  postItCalories: {
    marginBottom: 8,
  },
  postItCaloriesText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    fontFamily: 'Courier',
  },
  postItDivider: {
    height: 1,
    backgroundColor: '#D4C100',
    marginVertical: 12,
  },
  postItMacros: {
    gap: 8,
  },
  postItMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postItMacroEmoji: {
    fontSize: 16,
    width: 20,
  },
  postItMacroLabel: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 1,
    fontFamily: 'Courier',
  },
  postItMacroValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
  postItFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D4C100',
  },
  postItServingText: {
    fontSize: 12,
    color: '#4a4a4a',
    fontStyle: 'italic',
    fontFamily: 'Courier',
  },
});