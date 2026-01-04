import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

export default function EditMealScreen({ route, navigation }) {
  const { meal } = route.params;
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const [productName, setProductName] = useState(meal.product_name);
  const [servingGrams, setServingGrams] = useState(String(meal.serving_grams || 100));
  const [calories, setCalories] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.protein));
  const [carbs, setCarbs] = useState(String(meal.carbs));
  const [fat, setFat] = useState(String(meal.fat));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!productName.trim() || !calories) {
      Alert.alert(t('editMeal.missingInfo'), t('editMeal.enterNameCalories'));
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('meals')
        .update({
          product_name: productName.trim(),
          serving_grams: parseFloat(servingGrams) || 100,
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
        })
        .eq('id', meal.id);

      if (error) throw error;

      Alert.alert(
        t('editMeal.updated'),
        t('editMeal.mealUpdated'),
        [{ text: t('editMeal.ok'), onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Error updating meal:', error);
      Alert.alert(t('editMeal.error'), t('editMeal.failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('editMeal.title')}</Text>
        </View>

        <View style={styles.form}>
          {/* Meal Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t('editMeal.mealName')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              value={productName}
              onChangeText={setProductName}
            />
          </View>

          {/* Serving Size */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t('editMeal.servingSize')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              value={servingGrams}
              onChangeText={setServingGrams}
              keyboardType="numeric"
            />
          </View>

          {/* Calories */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t('editMeal.calories')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
            />
          </View>

          {/* Macros Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={[styles.label, { color: theme.text }]}>{t('editMeal.protein')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: theme.text }]}>{t('editMeal.carbs')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t('editMeal.fat')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
              value={fat}
              onChangeText={setFat}
              keyboardType="numeric"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? t('editMeal.saving') : t('editMeal.saveChanges')}
            </Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity 
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>{t('editMeal.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  form: {
    padding: 20,
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
});