import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';
import { showToast } from '../components/VeethaToast';
import { posthog } from '../utils/posthog';

export default function ManualEntryScreen({ navigation }) {
  const { theme } = useTheme();
  
  const [mealName, setMealName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [searchingNutrition, setSearchingNutrition] = useState(false);

  const handleSearchNutrition = async () => {
    if (!mealName.trim()) {
      Alert.alert('Enter a food name first', 'Please type a food name before searching');
      return;
    }

    setSearchingNutrition(true);

    try {
      // Use your existing searchFood function from foodDatabase.js
      const nutritionData = await searchFood(mealName.trim());

      if (nutritionData) {
        // Auto-fill the form with found nutrition
        setCalories(nutritionData.nutriments['energy-kcal']?.toString() || '');
        setProtein(nutritionData.nutriments.proteins?.toString() || '');
        setCarbs(nutritionData.nutriments.carbohydrates?.toString() || '');
        setFat(nutritionData.nutriments.fat?.toString() || '');
        setSugar(nutritionData.nutriments.sugar?.toString() || '');
        setSodium(nutritionData.nutriments.sodium?.toString() || '');

        showToast('success', 'Nutrition Found!', `We found nutrition info for "${nutritionData.name}". You can edit it if needed.`);
      } else {
        Alert.alert(
          'Not Found',
          'We couldn\'t find nutrition info for this food. Please enter it manually or try a different search term.'
        );
      }
    } catch (error) {
      console.error('Error searching nutrition:', error);
      Alert.alert('Error', 'Failed to search for nutrition info');
    } finally {
      setSearchingNutrition(false);
    }
  };

  const handleGPTNutrition = async () => {
    if (!mealName.trim()) {
      Alert.alert('Enter a meal description first', 'Type what you ate before searching');
      return;
    }
    setSearchingNutrition(true);
    try {
      const { data, error } = await supabase.functions.invoke('openai-proxy', {
        body: {
          model: 'gpt-4o-mini',
          max_tokens: 150,
          messages: [
            {
              role: 'user',
              content: `Estimate the total nutrition for: "${mealName.trim()}". Return ONLY a JSON object with no markdown or backticks:
{"calories": number, "protein": number, "carbs": number, "fat": number, "serving_grams": number}
All values should be for the total amount described, not per 100g.`
            }
          ]
        }
      });

      if (error) throw new Error(error.message || 'OpenAI proxy error');
      if (data?.error) throw new Error(data.error?.message || 'OpenAI error');

      const content = data.choices[0]?.message?.content;
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      setCalories(parsed.calories?.toString() || '');
      setProtein(parsed.protein?.toString() || '');
      setCarbs(parsed.carbs?.toString() || '');
      setFat(parsed.fat?.toString() || '');
      if (parsed.serving_grams) setServingSize(parsed.serving_grams.toString());

      posthog.capture('ai_nutrition_estimated', { source: 'manual_entry' });
      showToast('success', 'Nutrition Estimated!', 'Review and adjust if needed.');
    } catch (error) {
      console.error('GPT nutrition error:', error);
      Alert.alert('Error', 'Could not estimate nutrition. Please enter manually.');
    } finally {
      setSearchingNutrition(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!mealName.trim()) {
      Alert.alert('Missing Info', 'Please enter a meal name');
      return;
    }

    if (!calories || parseFloat(calories) <= 0) {
      Alert.alert('Missing Info', 'Please enter calories');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Please log in');
        navigation.navigate('Login');
        return;
      }

      // Save meal
      const { error } = await supabase.from('meals').insert({
              user_id: user.id,
              barcode: null,
              product_name: mealName.trim(),
              serving_grams: parseFloat(servingSize) || null,
              calories: parseFloat(calories),
              protein: parseFloat(protein) || 0,
              carbs: parseFloat(carbs) || 0,
              fat: parseFloat(fat) || 0,
              fiber: 0,
              sugar: parseFloat(sugar) || 0,
              sodium: parseFloat(sodium) || 0,
            });

      if (error) throw error;

      posthog.capture('meal_logged', { source: 'manual' });
      showToast('success', 'Meal Logged!', `${mealName} has been added to your meal log.`);
      navigation.navigate('Home');

    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.title, { color: theme.text }]}>✏️ Manual Entry</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your meal details manually
            </Text>
          </View>

          <View style={styles.form}>
            {/* Meal Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Meal Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., Chicken Breast"
                placeholderTextColor={theme.textTertiary}
                value={mealName}
                onChangeText={setMealName}
              />
            </View>

            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: theme.primary }]}
              onPress={handleGPTNutrition}
              disabled={searchingNutrition || !mealName.trim()}
            >
              <Text style={styles.searchButtonText}>
                {searchingNutrition ? '🔍 Estimating...' : '✨ Estimate Nutrition with AI'}
              </Text>
            </TouchableOpacity>

            {/* Serving Size */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Serving Size (grams)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., 150"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={servingSize}
                onChangeText={setServingSize}
              />
            </View>

            {/* Nutrition Values */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Nutrition Information *</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Calories *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Protein (g)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Carbs (g)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Fat (g)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="numeric"
                value={fat}
                onChangeText={setFat}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Sugar (g)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                  value={sugar}
                  onChangeText={setSugar}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Sodium (mg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                  value={sodium}
                  onChangeText={setSodium}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Log This Meal'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
  },
  searchButton: {
    marginVertical: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});