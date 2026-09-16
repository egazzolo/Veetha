import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { usePremiumStatus } from '../utils/usePremiumStatus';
import { showToast } from '../components/VeethaToast';
import {
  getFrequentMeals,
  addFrequentMeal,
  removeFrequentMeal,
  logFrequentMealNow,
  FREE_FREQUENT_MEALS_LIMIT,
} from '../utils/frequentMeals';

function mealLabel(item, t) {
  if (item.product?.name) return item.product.name;
  if (item.individual_foods?.length) {
    return item.individual_foods.map((f) => f.food_name).filter(Boolean).join(', ') || t('home.customMeal');
  }
  return t('home.customMeal');
}

// AI-photo meals have no single serving_grams/product row -- each detected
// food carries its own per-100g values and typical serving size, so the
// total is a sum across all of them (same shape as the AI-photo logging
// flow itself uses when it first saves the meal).
function mealCalories(item) {
  if (item.product?.calories != null) {
    return Math.round((item.product.calories * (item.serving_grams || 100)) / 100);
  }
  if (item.individual_foods?.length) {
    return Math.round(
      item.individual_foods.reduce(
        (sum, f) => sum + ((f.calories_per_100g || 0) * (f.typical_serving_grams || 0)) / 100,
        0
      )
    );
  }
  return null;
}

export default function FrequentMealsScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user } = useUser();
  const { isPremium } = usePremiumStatus();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getFrequentMeals(user.id);
      setItems(data);
    } catch (e) {
      console.error('FrequentMeals load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const handleAddToToday = async (item) => {
    setAddingId(item.id);
    try {
      await logFrequentMealNow(user.id, item);
      showToast('success', t('home.added'), mealLabel(item, t));
    } catch (e) {
      console.error('FrequentMeals add error:', e);
      showToast('error', t('home.error'), t('home.failedToAdd'));
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (item) => {
    try {
      await removeFrequentMeal(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      console.error('FrequentMeals remove error:', e);
    }
  };

  // Lets users pull in a meal logged before this screen's long-press
  // shortcut existed, instead of only being able to add whatever they
  // happen to log next.
  const handlePickPastMeal = async (meal) => {
    const result = await addFrequentMeal(user.id, meal, isPremium);
    if (result.success) {
      load();
    } else if (result.reason === 'cap') {
      Alert.alert(
        t('home.frequentMealCapTitle'),
        t('home.frequentMealCapBody', { limit: FREE_FREQUENT_MEALS_LIMIT }),
        [
          { text: t('home.cancel'), style: 'cancel' },
          { text: 'Go Premium', onPress: () => navigation.navigate('Paywall', { highlightFeature: 'Frequent meals' }) },
        ]
      );
    } else {
      console.error('Error adding frequent meal:', result.reason);
      showToast('error', t('home.error'), t('home.failedToAdd'));
    }
  };

  const openMealPicker = () => {
    navigation.navigate('MealPicker', {
      excludeProductIds: items.map((i) => i.product_id).filter(Boolean),
      returnFullMeal: true,
      onSelect: handlePickPastMeal,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('home.frequentMeals')}</Text>
        <TouchableOpacity onPress={openMealPicker} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.addBtn, { color: theme.primary }]}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.capText, { color: theme.textTertiary }]}>
        {isPremium
          ? t('home.frequentMealsCountPremium', { count: items.length })
          : t('home.frequentMealsCountFree', { count: items.length, limit: FREE_FREQUENT_MEALS_LIMIT })}
      </Text>

      {/* This "how to add" hint used to only show in the empty state below --
          once a user saved their first meal it vanished along with the empty
          state, leaving no way to discover how to add more. Keeping it
          visible regardless of list size fixes that. */}
      {!loading && (
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>{t('home.noFrequentMeals')}</Text>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : items.length === 0 ? null : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.cardBackground }]}
              onPress={() => handleAddToToday(item)}
              disabled={addingId === item.id}
            >
              {item.image_url || item.product?.image_url ? (
                <Image source={{ uri: item.image_url || item.product.image_url }} style={styles.rowImage} resizeMode="cover" />
              ) : (
                <View style={[styles.rowImage, styles.rowImagePlaceholder, { backgroundColor: theme.background }]}>
                  <Text style={{ fontSize: 20 }}>🍽️</Text>
                </View>
              )}
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: theme.text }]} numberOfLines={1}>
                  {mealLabel(item, t)}
                </Text>
                {mealCalories(item) != null && (
                  <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                    {mealCalories(item)} {t('home.kcal')}
                  </Text>
                )}
              </View>
              {addingId === item.id ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { fontSize: 22, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  addBtn: { fontSize: 26, fontWeight: '600', width: 24, textAlign: 'center' },
  capText: { fontSize: 12.5, textAlign: 'center', marginBottom: 12 },
  hintText: { textAlign: 'center', fontSize: 13, marginTop: 4, marginBottom: 16, paddingHorizontal: 30, lineHeight: 19 },
  list: { paddingHorizontal: 20, paddingBottom: 30, gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 10, gap: 12,
  },
  rowImage: { width: 46, height: 46, borderRadius: 10 },
  rowImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14.5, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
  removeBtn: { fontSize: 16, color: '#E53935', fontWeight: '700', paddingHorizontal: 4 },
});
