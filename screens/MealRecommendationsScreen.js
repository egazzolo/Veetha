import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { searchRecipes, saveRecipeToDatabase, getRecipesFromDatabase } from '../utils/spoonacular';
import { supabase } from '../utils/supabase';
import { logScreen, logEvent } from '../utils/analytics';

export default function MealRecommendationsScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { profile } = useUser();
  
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMealType, setSelectedMealType] = useState('dinner'); // breakfast, lunch, dinner

  useEffect(() => {
    logScreen('MealRecommendations');
    loadRecipes();
  }, [selectedMealType]);

  const loadRecipes = async () => {
    setLoading(true);
    
    try {
      // First, try to load from YOUR database
      const dbRecipes = await getRecipesFromDatabase({
        dishType: selectedMealType,
        maxCalories: profile?.daily_calorie_goal / 3, // Rough estimate per meal
      });

      if (dbRecipes.length > 0) {
        console.log('✅ Loaded recipes from database');
        setRecipes(dbRecipes);
        setLoading(false);
        return;
      }

      // If no recipes in database, fetch from Spoonacular
      console.log('📡 Fetching from Spoonacular...');
      const filters = {
        type: selectedMealType,
        number: 10,
        maxCalories: profile?.daily_calorie_goal ? Math.round(profile.daily_calorie_goal / 3) : 700,
      };

      // Add diet filters
      if (profile?.diet_type && profile.diet_type !== 'none') {
        filters.diet = profile.diet_type;
      }

      // Add allergy filters
      if (profile?.allergies && profile.allergies.length > 0) {
        filters.intolerances = profile.allergies.join(',');
      }

      const apiRecipes = await searchRecipes(filters);
      
      // Save to database for next time
      for (const recipe of apiRecipes) {
        await saveRecipeToDatabase(recipe);
      }

      setRecipes(apiRecipes);
      logEvent('recipes_fetched', { source: 'spoonacular', count: apiRecipes.length });
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogMeal = async (recipe) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log the recipe as a meal
      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        product_name: recipe.title,
        serving_grams: recipe.servings ? 100 * recipe.servings : 100,
        calories: recipe.calories || 0,
        protein: recipe.protein || 0,
        carbs: recipe.carbs || 0,
        fat: recipe.fat || 0,
        image_url: recipe.image_url || recipe.image,
      });

      if (error) throw error;

      alert('✅ ' + t('mealLogged'));
      logEvent('recipe_logged', { recipe_title: recipe.title });
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error logging recipe:', error);
      alert('Failed to log meal');
    }
  };

  const mealTypes = [
    { value: 'breakfast', label: '🍳 Breakfast', emoji: '🍳' },
    { value: 'lunch', label: '🥗 Lunch', emoji: '🥗' },
    { value: 'dinner', label: '🍽️ Dinner', emoji: '🍽️' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>🍽️ Meal Ideas</Text>
      </View>

      {/* Meal Type Tabs */}
      <View style={styles.tabs}>
        {mealTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.tab,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
              selectedMealType === type.value && { 
                backgroundColor: theme.primary, 
                borderColor: theme.primary 
              },
            ]}
            onPress={() => setSelectedMealType(type.value)}
          >
            <Text style={[
              styles.tabText,
              { color: selectedMealType === type.value ? '#fff' : theme.text }
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recipes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Finding recipes...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }}>
          {recipes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No recipes found. Try a different meal type!
              </Text>
            </View>
          ) : (
            recipes.map((recipe) => (
              <View key={recipe.id || recipe.spoonacular_id} style={[styles.recipeCard, { backgroundColor: theme.cardBackground }]}>
                {(recipe.image || recipe.image_url) && (
                  <Image 
                    source={{ uri: recipe.image || recipe.image_url }} 
                    style={styles.recipeImage}
                  />
                )}
                
                <View style={styles.recipeInfo}>
                  <Text style={[styles.recipeTitle, { color: theme.text }]}>
                    {recipe.title}
                  </Text>
                  
                  <View style={styles.nutritionRow}>
                    <Text style={[styles.nutritionText, { color: theme.textSecondary }]}>
                      🔥 {Math.round(recipe.calories)} cal
                    </Text>
                    <Text style={[styles.nutritionText, { color: theme.textSecondary }]}>
                      💪 {Math.round(recipe.protein)}g
                    </Text>
                    <Text style={[styles.nutritionText, { color: theme.textSecondary }]}>
                      🌾 {Math.round(recipe.carbs)}g
                    </Text>
                    <Text style={[styles.nutritionText, { color: theme.textSecondary }]}>
                      🥑 {Math.round(recipe.fat)}g
                    </Text>
                  </View>

                  {recipe.ready_in_minutes && (
                    <Text style={[styles.readyTime, { color: theme.textTertiary }]}>
                      ⏱️ Ready in {recipe.ready_in_minutes} min
                    </Text>
                  )}

                  <TouchableOpacity 
                    style={[styles.logButton, { backgroundColor: theme.primary }]}
                    onPress={() => handleLogMeal(recipe)}
                  >
                    <Text style={styles.logButtonText}>✓ Log This Meal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  recipeCard: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 200,
  },
  recipeInfo: {
    padding: 15,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 8,
  },
  nutritionText: {
    fontSize: 13,
  },
  readyTime: {
    fontSize: 12,
    marginBottom: 12,
  },
  logButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});