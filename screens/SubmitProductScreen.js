import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../utils/supabase';
import { useTheme } from '../utils/ThemeContext';

export default function SubmitProductScreen({ route, navigation }) {
  const { barcode } = route.params;
  const { theme } = useTheme();
  const [productName, setProductName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!productName.trim()) {
      Alert.alert('Missing Info', 'Please enter product name');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Save to pending_products table
      const { error } = await supabase.from('pending_products').insert({
        barcode: barcode,
        product_name: productName.trim(),
        submitted_by: user?.id,
      });

      if (error) throw error;

      Alert.alert('Thank You! ✅', 'Product submitted for review', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error) {
      console.error('Error submitting product:', error);
      Alert.alert('Error', 'Failed to submit product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.title, { color: theme.text }]}>Submit Product</Text>
        <Text style={[styles.barcode, { color: theme.textSecondary }]}>Barcode: {barcode}</Text>

        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="Product name"
          placeholderTextColor={theme.textTertiary}
          value={productName}
          onChangeText={setProductName}
        />

        <TouchableOpacity 
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.cancel, { color: theme.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 16, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  barcode: { fontSize: 14, marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20 },
  submitButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancel: { textAlign: 'center', fontSize: 14 },
});