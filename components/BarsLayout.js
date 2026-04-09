import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function BarsLayout({
  theme,
  t,
  loading,
  refreshing,
  consumed,
  protein,
  carbs,
  fat,
  dailyGoal,
  remaining,
  proteinPercent,
  carbsPercent,
  fatPercent,
  setSelectedNutrient,
  setShowNutrientModal,
  exerciseCaloriesBurned,
}) {
  return (
    <View>
      {/* Calories Display */}
      <View style={[styles.caloriesCard, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity 
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('calories');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <Text style={[styles.todayLabel, { color: theme.textSecondary }]}>{t('home.today')}</Text>
          <View style={styles.caloriesRow}>
            <Text style={[styles.caloriesValue, { color: theme.text }]}>
              {Math.round(consumed)}
            </Text>
            <Text style={[styles.caloriesGoal, { color: theme.textSecondary }]}>
              /{dailyGoal} kcal
            </Text>
          </View>
          <Text style={[styles.remainingText, { color: remaining >= 0 ? theme.success : theme.error }]}>
            {Math.abs(Math.round(remaining))} {remaining >= 0 ? t('home.remaining') : t('home.over')}
          </Text>
          {exerciseCaloriesBurned > 0 && (
            <Text style={[styles.exerciseCaloriesText, { color: '#4CAF50', marginTop: 4 }]}>
              +{Math.round(exerciseCaloriesBurned)} {t('home.fromExercise')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Macros Progress Bars */}
      <View style={[styles.macrosCard, { backgroundColor: theme.cardBackground }]}>
        {/* Protein Bar */}
        <TouchableOpacity 
          style={styles.macroRow}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('protein');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <Text style={[styles.macroLabel, { color: theme.text }]}>{t('home.protein')}</Text>
          <View style={styles.macroRight}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: '#2196F3', 
                    width: `${Math.min(proteinPercent, 100)}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.macroValue, { color: theme.text }]}>
              {Math.round(protein)}/150g
            </Text>
          </View>
        </TouchableOpacity>

        {/* Carbs Bar */}
        <TouchableOpacity 
          style={styles.macroRow}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('carbs');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <Text style={[styles.macroLabel, { color: theme.text }]}>{t('home.carbs')}</Text>
          <View style={styles.macroRight}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: '#FF9800', 
                    width: `${Math.min(carbsPercent, 100)}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.macroValue, { color: theme.text }]}>
              {Math.round(carbs)}/200g
            </Text>
          </View>
        </TouchableOpacity>

        {/* Fat Bar */}
        <TouchableOpacity 
          style={styles.macroRow}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('fat');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <Text style={[styles.macroLabel, { color: theme.text }]}>{t('home.fat')}</Text>
          <View style={styles.macroRight}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: '#9C27B0', 
                    width: `${Math.min(fatPercent, 100)}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.macroValue, { color: theme.text }]}>
              {Math.round(fat)}/65g
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caloriesCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  todayLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  caloriesGoal: {
    fontSize: 18,
    marginLeft: 4,
  },
  remainingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  macrosCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
  },
  macroRow: {
    marginBottom: 20,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  macroRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  exerciseCaloriesText: {
    fontSize: 14,
    fontWeight: '600',
  },
});