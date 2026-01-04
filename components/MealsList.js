import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

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
        meals.map((meal) => (
          <TouchableOpacity
            key={meal.id}
            style={[styles.mealCard, { backgroundColor: theme.cardBackground }]}
            onLongPress={() => handleMealLongPress(meal)}
            activeOpacity={0.7}
          >
            {/* Image Section - 35% */}
            <View style={styles.imageSection}>
              {meal.image_url ? (
                <Image 
                  source={{ uri: meal.image_url }} 
                  style={styles.mealImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderEmoji}>🍽️</Text>
                </View>
              )}
            </View>

            {/* Product Name & Macros Section - 35% */}
            <View style={styles.infoSection}>
              <Text 
                style={[styles.productName, { color: theme.text }]} 
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {meal.product_name}
              </Text>
              
              {/* Serving Size */}
              <Text style={[styles.servingSize, { color: theme.textTertiary }]}>
                {meal.serving_grams}g
              </Text>
              
              {/* Primary macros - Top row */}
              <View style={styles.macrosContainer}>
                <View style={styles.macroRow}>
                  <Text style={styles.macroEmoji}>💪</Text>
                  <Text style={styles.proteinText}>
                    {Math.round(meal.protein || 0)}g
                  </Text>
                </View>
                <View style={styles.macroRow}>
                  <Text style={styles.macroEmoji}>🌾</Text>
                  <Text style={styles.carbsText}>
                    {Math.round(meal.carbs || 0)}g
                  </Text>
                </View>
                <View style={styles.macroRow}>
                  <Text style={styles.macroEmoji}>🥑</Text>
                  <Text style={styles.fatText}>
                    {Math.round(meal.fat || 0)}g
                  </Text>
                </View>
              </View>

              {/* Secondary macros - Bottom row */}
              <View style={styles.macrosContainer}>
                <View style={styles.macroRow}>
                  <Text style={styles.macroEmoji}>🧂</Text>
                  <Text style={styles.sodiumText}>
                    {Math.round(meal.sodium || 0)}mg
                  </Text>
                </View>
                <View style={styles.macroRow}>
                  <Text style={styles.macroEmoji}>🍬</Text>
                  <Text style={styles.sugarText}>
                    {Math.round(meal.sugar || 0)}g
                  </Text>
                </View>
                <View style={styles.macroRow}>
                  <Text style={styles.macroEmoji}>🌿</Text>
                  <Text style={styles.fiberText}>
                    {Math.round(meal.fiber || 0)}g
                  </Text>
                </View>
              </View>
            </View>

            {/* Calories Section - 30% */}
            <View style={styles.caloriesSection}>
              <Text style={styles.caloriesNumber}>
                {Math.round(meal.calories || 0)}
              </Text>
              <Text style={styles.caloriesLabel}>{t('home.kcal')}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
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
});