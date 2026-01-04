import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync, MediaTypeOptions } from 'expo-image-picker';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';

export default function SubmitProductScreen({ route, navigation }) {
  const { barcode, productName } = route.params;
  const { theme } = useTheme();
  
  const [productNameState, setProductNameState] = useState(productName || '');
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

  // Upload image to Supabase Storage
  const uploadImage = async (imageUri, imageName) => {
    try {
      console.log('📤 Uploading image:', imageName);

      // For React Native, we need to use FormData or read as base64
      // But Supabase Storage accepts ArrayBuffer, so we'll use XMLHttpRequest
      
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      // Create file path with timestamp to avoid duplicates
      const filePath = `${Date.now()}_${imageName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-submissions')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-submissions')
        .getPublicUrl(filePath);

      console.log('✅ Image uploaded:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  };

  const pickImage = async (imageType) => {
    try {
      const { status } = await requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos');
        return;
      }

      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (imageType === 'label') setNutritionLabelImage(result.assets[0].uri);
        else if (imageType === 'ingredients') setIngredientsImage(result.assets[0].uri);
        else if (imageType === 'name') setProductNameImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async (imageType) => {
    try {
      const { status } = await requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access');
        return;
      }

      const result = await launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (imageType === 'label') setNutritionLabelImage(result.assets[0].uri);
        else if (imageType === 'ingredients') setIngredientsImage(result.assets[0].uri);
        else if (imageType === 'name') setProductNameImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!productNameState.trim()) {
      Alert.alert('Missing Info', 'Please enter the product name');
      return;
    }

    if (!calories || !protein || !carbs || !fat) {
      Alert.alert('Missing Info', 'Please enter all nutrition values');
      return;
    }

    if (!nutritionLabelImage || !ingredientsImage || !productNameImage) {
      Alert.alert('Missing Photos', 'Please upload all 3 required photos');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'Please log in to submit products');
        navigation.navigate('Login');
        return;
      }

      // Upload all 3 images
      console.log('📤 Uploading images...');
      const [labelUrl, ingredientsUrl, nameUrl] = await Promise.all([
        uploadImage(nutritionLabelImage, 'nutrition_label.jpg'),
        uploadImage(ingredientsImage, 'ingredients.jpg'),
        uploadImage(productNameImage, 'product_name.jpg'),
      ]);

      console.log('✅ All images uploaded!');

      // Save to pending_products table with image URLs
      const { error } = await supabase.from('pending_products').insert({
        user_id: user.id,
        barcode: barcode,
        product_name: productNameState.trim(),
        serving_size: servingSize.trim(),
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        carbs: parseFloat(carbs),
        fat: parseFloat(fat),
        sugar: parseFloat(sugar) || 0,
        sodium: parseFloat(sodium) || 0,
        nutrition_label_image: labelUrl,
        ingredients_image: ingredientsUrl,
        product_name_image: nameUrl,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert(
        'Submitted! ✅',
        'Thank you! We\'ll review this product and add it to the database.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );

    } catch (error) {
      console.error('Error submitting product:', error);
      Alert.alert('Error', 'Failed to submit product. Please try again.');
    } finally {
      setSubmitting(false);
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
            <Text style={[styles.title, { color: theme.text }]}>Submit New Product</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Help us add this product to our database
            </Text>
            <Text style={[styles.barcode, { color: theme.textTertiary }]}>Barcode: {barcode}</Text>
          </View>

          <View style={styles.form}>
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Product Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., Coca-Cola 355ml"
                placeholderTextColor={theme.textTertiary}
                value={productNameState}
                onChangeText={setProductNameState}
              />
            </View>

            {/* Serving Size */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Serving Size</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., 355ml or 100g"
                placeholderTextColor={theme.textTertiary}
                value={servingSize}
                onChangeText={setServingSize}
              />
            </View>

            {/* Nutrition Values */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Nutrition per serving *</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.label, { color: theme.text }]}>Calories</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
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
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
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

              <View style={[styles.inputGroup, { flex: 1 }]}>
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

            {/* Photo Uploads - 3 Required */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Product Photos *</Text>
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                Please upload 3 photos for verification
              </Text>
              
              {/* Nutrition Label Photo */}
              <View style={styles.photoSection}>
                <Text style={[styles.photoLabel, { color: theme.text }]}>1. Nutrition Label</Text>
                <View style={styles.photoButtons}>
                  <TouchableOpacity 
                    style={[styles.photoButton, { backgroundColor: theme.primary }]}
                    onPress={() => takePhoto('label')}
                  >
                    <Text style={styles.photoButtonText}>📷 Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.photoButton, { backgroundColor: theme.secondary || theme.primary }]}
                    onPress={() => pickImage('label')}
                  >
                    <Text style={styles.photoButtonText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
                {nutritionLabelImage && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: nutritionLabelImage }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setNutritionLabelImage(null)}
                    >
                      <Text style={styles.removeImageText}>❌ Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Ingredients Photo */}
              <View style={styles.photoSection}>
                <Text style={[styles.photoLabel, { color: theme.text }]}>2. Ingredients List</Text>
                <View style={styles.photoButtons}>
                  <TouchableOpacity 
                    style={[styles.photoButton, { backgroundColor: theme.primary }]}
                    onPress={() => takePhoto('ingredients')}
                  >
                    <Text style={styles.photoButtonText}>📷 Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.photoButton, { backgroundColor: theme.secondary || theme.primary }]}
                    onPress={() => pickImage('ingredients')}
                  >
                    <Text style={styles.photoButtonText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
                {ingredientsImage && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: ingredientsImage }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setIngredientsImage(null)}
                    >
                      <Text style={styles.removeImageText}>❌ Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Product Name Photo */}
              <View style={styles.photoSection}>
                <Text style={[styles.photoLabel, { color: theme.text }]}>3. Product Name (Front)</Text>
                <View style={styles.photoButtons}>
                  <TouchableOpacity 
                    style={[styles.photoButton, { backgroundColor: theme.primary }]}
                    onPress={() => takePhoto('name')}
                  >
                    <Text style={styles.photoButtonText}>📷 Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.photoButton, { backgroundColor: theme.secondary || theme.primary }]}
                    onPress={() => pickImage('name')}
                  >
                    <Text style={styles.photoButtonText}>🖼️ Gallery</Text>
                  </TouchableOpacity>
                </View>
                {productNameImage && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: productNameImage }} style={styles.previewImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setProductNameImage(null)}
                    >
                      <Text style={styles.removeImageText}>❌ Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Product'}
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
    marginBottom: 10,
  },
  barcode: {
    fontSize: 12,
    fontFamily: 'monospace',
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
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoSection: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  photoLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  helperText: {
    fontSize: 12,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  imagePreview: {
    marginTop: 15,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  removeImageButton: {
    marginTop: 10,
    padding: 8,
  },
  removeImageText: {
    fontSize: 14,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
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