import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

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

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'Please log in to save meals');
        navigation.navigate('Login');
        return;
      }

      // Save to database
      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        product_name: mealName.trim(),
        serving_grams: parseFloat(servingGrams) || 100,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        image_url: null,
      });

      if (error) throw error;

      // Refresh meals list
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
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Meal Details</Text>

          {/* Meal Name */}
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

          {/* Serving Size */}
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

          {/* Calories */}
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

          {/* Protein */}
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

          {/* Carbs */}
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

          {/* Fat */}
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

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : '✓ Save Meal'}
            </Text>
          </TouchableOpacity>

          {/* Hint */}
          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            💡 Tip: You only need to enter meal name and calories. Macros are optional!
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