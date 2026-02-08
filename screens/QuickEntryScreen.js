import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { getSuggestionsForMealTime, LOCAL_FOODS, DEFAULT_FOODS } from '../utils/localFoods';

export default function QuickEntryScreen({ navigation }) {
  const { refreshMeals } = useUser();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const [mealName, setMealName] = useState('');
  const [servingGrams, setServingGrams] = useState('100');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  
  // NEW: Quick suggestions
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [userCountry, setUserCountry] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load suggestions on mount
  useEffect(() => {
    loadQuickSuggestions();
  }, []);

  const loadQuickSuggestions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        const countryCode = geocode.isoCountryCode;
        setUserCountry(countryCode);
        
        const { suggestions, mealType, country } = getSuggestionsForMealTime(countryCode);
        setQuickSuggestions(suggestions);
        
        console.log(`🌍 Showing ${mealType} suggestions for ${country}`);
      } else {
        // Use default suggestions
        const hour = new Date().getHours();
        const mealType = hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : 'dinner';
        setQuickSuggestions(DEFAULT_FOODS[mealType] || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleQuickLog = async (food) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create product if doesn't exist
      const { data: existingProduct } = await supabase
        .from('food_database')
        .select('id')
        .eq('name', food.name)
        .maybeSingle();

      let productId;

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        const { data: newProduct } = await supabase
          .from('food_database')
          .insert({
            name: food.name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            source: 'local_suggestion',
          })
          .select('id')
          .single();
        
        productId = newProduct.id;
      }

      // Log meal
      await supabase.from('meals').insert({
        user_id: user.id,
        product_id: productId,
        serving_grams: 100,
      });

      await refreshMeals();
      
      Alert.alert('Logged! ✅', `${food.emoji} ${food.name} added`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
      
    } catch (error) {
      console.error('Error quick logging:', error);
      Alert.alert('Error', 'Failed to log meal');
    }
  };

  const handleSave = async () => {
    if (!mealName.trim()) {
      Alert.alert('Missing Info', 'Please enter a meal name');
      return;
    }
    if (!calories || parseFloat(calories) <= 0) {
      Alert.alert('Missing Info', 'Please enter calories');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Please log in');
        navigation.navigate('Login');
        return;
      }

      // Create product in food_database
      const { data: newProduct, error: productError } = await supabase
        .from('food_database')
        .insert({
          name: mealName.trim(),
          calories: parseFloat(calories),
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
          source: 'manual_entry',
          added_by_user_id: user.id,
          serving_unit: 'g',
        })
        .select('id')
        .single();

      if (productError) throw productError;

      // Log meal with product_id
      const { error: mealError } = await supabase.from('meals').insert({
        user_id: user.id,
        product_id: newProduct.id,
        serving_grams: parseFloat(servingGrams) || 100,
        serving_unit: 'g',
      });

      if (mealError) throw mealError;

      await refreshMeals();

      Alert.alert('Success! ✅', 'Meal logged successfully', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);

    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save meal: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backArrow, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Quick Entry</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Quick Suggestions Dropdown */}
        {quickSuggestions.length > 0 && (
          <View style={[styles.suggestionsCard, { backgroundColor: theme.cardBackground }]}>
            <TouchableOpacity 
              style={styles.suggestionsHeader}
              onPress={() => setShowSuggestions(!showSuggestions)}
            >
              <View>
                <Text style={[styles.suggestionsTitle, { color: theme.text }]}>
                  ⚡ Quick Add
                </Text>
                <Text style={[styles.suggestionsSubtitle, { color: theme.textSecondary }]}>
                  {userCountry ? `Popular in ${LOCAL_FOODS[userCountry]?.name || 'your area'}` : 'Common foods'}
                </Text>
              </View>
              <Text style={[styles.dropdownArrow, { color: theme.text }]}>
                {showSuggestions ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {showSuggestions && (
              <View style={styles.suggestionsList}>
                {quickSuggestions.map((food, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleQuickLog(food)}
                  >
                    <Text style={styles.suggestionEmoji}>{food.emoji}</Text>
                    <View style={styles.suggestionInfo}>
                      <Text style={[styles.suggestionName, { color: theme.text }]}>
                        {food.name}
                      </Text>
                      <Text style={[styles.suggestionCals, { color: theme.textSecondary }]}>
                        {food.calories} kcal • {food.protein}g protein
                      </Text>
                    </View>
                    <Text style={[styles.addButton, { color: theme.primary }]}>+ Add</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Manual Entry Form */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Meal Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Meal Name *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="e.g., Chicken Salad"
              placeholderTextColor={theme.textTertiary}
              value={mealName}
              onChangeText={setMealName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Serving Size (grams)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="100"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              value={servingGrams}
              onChangeText={setServingGrams}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Calories (kcal) *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Macros (Optional)</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Protein (g)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              value={protein}
              onChangeText={setProtein}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Carbs (g)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              value={carbs}
              onChangeText={setCarbs}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Fat (g)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numeric"
              value={fat}
              onChangeText={setFat}
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : '✓ Save Meal'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            💡 Tip: Use Quick Add for common foods, or enter custom meals below
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  suggestionsCard: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  suggestionsSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  dropdownArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestionsList: {
    marginTop: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionCals: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});