import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';

const MARKER_SIZE = 20;

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
      <View style={styles.caloriesCard}>
        <TouchableOpacity 
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('calories');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <View style={styles.caloriesRow}>
            <Text style={[styles.caloriesValue, { color: '#4CAF50' }]}>
              {Math.round(consumed)}
            </Text>
            <Text style={[styles.caloriesGoal, { color: '#4CAF50' }]}>
              /{dailyGoal} kcal
            </Text>
          </View>
          <View style={[styles.progressBarWrapper, { marginTop: 8 }]}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: '#4CAF50',
                    width: `${Math.min((consumed / dailyGoal) * 100, 100)}%`,
                  }
                ]}
              />
            </View>
            <View style={[styles.progressMarker, { left: `${Math.min((consumed / dailyGoal) * 100, 100)}%` }]}>
              {/* The battery icon is a horizontal rectangle like the bar itself --
                  tilted so its outline reads against the bar instead of blending in. */}
              <AppIcon name="calories" size={MARKER_SIZE} style={styles.caloriesMarkerIcon} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Macros Progress Bars */}
      <View style={styles.macrosCard}>
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
            <View style={styles.progressBarWrapper}>
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
              <View style={[styles.progressMarker, { left: `${Math.min(proteinPercent, 100)}%` }]}>
                <AppIcon name="chicken" size={MARKER_SIZE} />
              </View>
            </View>
            <Text style={[styles.macroValue, { color: '#2196F3' }]}>
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
            <View style={styles.progressBarWrapper}>
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
              <View style={[styles.progressMarker, { left: `${Math.min(carbsPercent, 100)}%` }]}>
                <AppIcon name="bread" size={MARKER_SIZE} />
              </View>
            </View>
            <Text style={[styles.macroValue, { color: '#FF9800' }]}>
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
            <View style={styles.progressBarWrapper}>
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
              <View style={[styles.progressMarker, { left: `${Math.min(fatPercent, 100)}%` }]}>
                <AppIcon name="avocado" size={MARKER_SIZE} />
              </View>
            </View>
            <Text style={[styles.macroValue, { color: '#9C27B0' }]}>
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
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
    marginTop: 4,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  caloriesGoal: {
    fontSize: 18,
    marginLeft: 4,
  },
  macrosCard: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  macroRow: {
    marginBottom: 24,
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
  progressBarWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  progressBar: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Sits on top of the (overflow: hidden) bar rather than inside it, so the
  // icon isn't clipped by the bar's rounded track -- positioned by percentage
  // to ride along the fill's leading edge like a slider thumb.
  progressMarker: {
    position: 'absolute',
    top: -(MARKER_SIZE - 10) / 2,
    marginLeft: -MARKER_SIZE / 2,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caloriesMarkerIcon: {
    transform: [{ rotate: '-30deg' }],
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
});