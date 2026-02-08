import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  ScrollView, Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

export default function SubmitProductScreen({ route, navigation }) {
  const { barcode } = route.params;
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [productName, setProductName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');

  const [nutritionLabelImage, setNutritionLabelImage] = useState(null);
  const [ingredientsImage, setIngredientsImage] = useState(null);
  const [productNameImage, setProductNameImage] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const pickImage = async (setter) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      setter(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri, userId, label) => {
    if (!uri) return null;
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileName = `pending-${userId}-${label}-${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('meal-images')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('meal-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error(`Failed to upload ${label}:`, err.message);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      Alert.alert(t('submitProduct.missingInfo'), t('submitProduct.enterName'));
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Upload photos in parallel
      const [nutritionUrl, ingredientsUrl, productNameUrl] = await Promise.all([
        uploadImage(nutritionLabelImage, userId, 'nutrition'),
        uploadImage(ingredientsImage, userId, 'ingredients'),
        uploadImage(productNameImage, userId, 'productname'),
      ]);

      const { error } = await supabase.from('pending_products').insert({
        user_id: userId,
        barcode: barcode,
        product_name: productName.trim(),
        serving_size: servingSize.trim() || null,
        calories: calories ? parseFloat(calories) : null,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        sugar: sugar ? parseFloat(sugar) : null,
        sodium: sodium ? parseFloat(sodium) : null,
        status: 'pending',
        nutrition_label_image: nutritionUrl,
        ingredients_image: ingredientsUrl,
        product_name_image: productNameUrl,
      });

      if (error) throw error;

      Alert.alert(t('submitProduct.thankYou'), t('submitProduct.submitted'), [
        { text: t('common.ok'), onPress: () => navigation.navigate('Home') },
      ]);
    } catch (error) {
      console.error('Error submitting product:', error);
      Alert.alert(t('common.error'), t('submitProduct.failedToSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhotoButton = (uri, setter, label) => (
    <TouchableOpacity
      style={[styles.photoButton, { borderColor: theme.border }]}
      onPress={() => pickImage(setter)}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.photoPreview} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoIcon}>📷</Text>
          <Text style={[styles.photoLabel, { color: theme.textSecondary }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.backButton, { color: theme.primary }]}>← {t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.title, { color: theme.text }]}>{t('submitProduct.title')}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t('submitProduct.subtitle')}
            </Text>
            <Text style={[styles.barcodeText, { color: theme.textTertiary }]}>
              {t('submitProduct.barcode')}: {barcode}
            </Text>

            {/* Product Name */}
            <Text style={[styles.label, { color: theme.text }]}>{t('submitProduct.productName')} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder={t('submitProduct.productNamePlaceholder')}
              placeholderTextColor={theme.textTertiary}
              value={productName}
              onChangeText={setProductName}
            />

            {/* Serving Size */}
            <Text style={[styles.label, { color: theme.text }]}>{t('submitProduct.servingSize')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder={t('submitProduct.servingSizePlaceholder')}
              placeholderTextColor={theme.textTertiary}
              value={servingSize}
              onChangeText={setServingSize}
            />

            {/* Nutrition Fields - 2 per row */}
            <Text style={[styles.sectionLabel, { color: theme.text }]}>{t('submitProduct.nutritionInfo')}</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('submitProduct.calories')}</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('submitProduct.proteinG')}</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('submitProduct.carbsG')}</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('submitProduct.fatG')}</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('submitProduct.sugarG')}</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  value={sugar}
                  onChangeText={setSugar}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('submitProduct.sodiumMg')}</Text>
                <TextInput
                  style={[styles.smallInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  value={sodium}
                  onChangeText={setSodium}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Photo Section */}
            <Text style={[styles.sectionLabel, { color: theme.text }]}>{t('submitProduct.photos')}</Text>
            <Text style={[styles.photoHint, { color: theme.textTertiary }]}>
              {t('submitProduct.photosHint')}
            </Text>

            <View style={styles.photosRow}>
              {renderPhotoButton(nutritionLabelImage, setNutritionLabelImage, t('submitProduct.nutritionLabel'))}
              {renderPhotoButton(ingredientsImage, setIngredientsImage, t('submitProduct.ingredients'))}
              {renderPhotoButton(productNameImage, setProductNameImage, t('submitProduct.productPhoto'))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t('submitProduct.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 10 },
  backButton: { fontSize: 16, fontWeight: '600' },
  card: { borderRadius: 16, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 4 },
  barcodeText: { fontSize: 12, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 16 },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', marginTop: 8, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  halfField: { flex: 1 },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  smallInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  photosRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  photoButton: { flex: 1, aspectRatio: 0.8, borderWidth: 1.5, borderRadius: 10, borderStyle: 'dashed', overflow: 'hidden' },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 4 },
  photoIcon: { fontSize: 24, marginBottom: 4 },
  photoLabel: { fontSize: 10, textAlign: 'center' },
  photoHint: { fontSize: 11, marginBottom: 10 },
  submitButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
