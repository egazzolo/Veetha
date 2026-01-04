import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

// Circular Progress Component
function CircularProgress({ percentage, size = 80, strokeWidth = 6, color = '#fff', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          stroke="rgba(255,255,255,0.3)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}

export default function CardsLayout({
  theme,
  t,
  loading,
  refreshing,
  consumed,
  protein,
  carbs,
  fat,
  remaining,
  caloriePercent,
  proteinPercent,
  carbsPercent,  
  fatPercent,  
  setSelectedNutrient,
  setShowNutrientModal,
  caloriesCardRef,
  macroCardsRef,
  tutorialCompleted,
}) {
  return (
    <View>
      {/* 2x2 Card Grid */}
      <View 
        ref={macroCardsRef}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          if (macroCardsRef.current && macroCardsRef.current.measureInWindow) {
            macroCardsRef.current.measureInWindow((wx, wy, w, h) => {
              macroCardsRef.current.tutorialCoords = {
                top: wy,
                left: wx,
                width: w,
                height: h,
                borderRadius: 16
              };
            });
          }
        }}
        style={styles.cardGrid}
      >
        {/* Calories Card */}
        <TouchableOpacity
          ref={caloriesCardRef}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            if (caloriesCardRef.current && caloriesCardRef.current.measureInWindow) {
              caloriesCardRef.current.measureInWindow((wx, wy, w, h) => {
                caloriesCardRef.current.tutorialCoords = {
                  top: wy,
                  left: wx,
                  width: w,
                  height: h,
                  borderRadius: 16
                };
              });
            }
          }}
          style={[styles.card, styles.caloriesCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('calories');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress 
            percentage={caloriePercent} 
            size={80} 
            strokeWidth={6} 
            color="#fff"
          >
            <Text style={[
              styles.cardValue, 
              { fontSize: Math.round(consumed) >= 1000 ? 16 : 20 }
            ]}>
              {Math.round(consumed)}
            </Text>
          </CircularProgress>
          <Text style={styles.cardLabel}>{t('home.calories')}</Text>
        </TouchableOpacity>

        {/* Protein Card */}
        <TouchableOpacity
          style={[styles.card, styles.proteinCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('protein');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress 
            percentage={proteinPercent} 
            size={80} 
            strokeWidth={6} 
            color="#fff"
          >
            <Text style={[
              styles.cardValue, 
              { fontSize: Math.round(protein) >= 100 ? 16 : 20 }
            ]}>
              {Math.round(protein)}g
            </Text>
          </CircularProgress>
          <Text style={styles.cardLabel}>{t('home.protein')}</Text>
        </TouchableOpacity>

        {/* Carbs Card */}
        <TouchableOpacity
          style={[styles.card, styles.carbsCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('carbs');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress 
            percentage={carbsPercent} 
            size={80} 
            strokeWidth={6} 
            color="#fff"
          >
            <Text style={[
              styles.cardValue, 
              { fontSize: Math.round(carbs) >= 100 ? 16 : 20 }
            ]}>
              {Math.round(carbs)}g
            </Text>
          </CircularProgress>
          <Text style={styles.cardLabel}>{t('home.carbs')}</Text>
        </TouchableOpacity>

        {/* Fat Card */}
        <TouchableOpacity
          style={[styles.card, styles.fatCard]}
          onPress={() => {
            if (!loading && !refreshing) {
              setSelectedNutrient('fat');
              setShowNutrientModal(true);
            }
          }}
          disabled={loading || refreshing}
        >
          <CircularProgress 
            percentage={fatPercent} 
            size={80} 
            strokeWidth={6} 
            color="#fff"
          >
            <Text style={[
              styles.cardValue, 
              { fontSize: Math.round(fat) >= 100 ? 16 : 20 }
            ]}>
              {Math.round(fat)}g
            </Text>
          </CircularProgress>
          <Text style={styles.cardLabel}>{t('home.fat')}</Text>
        </TouchableOpacity>
      </View>

      {/* Remaining Text */}
      <View style={styles.remainingContainer}>
        <Text style={[styles.remainingText, { color: remaining >= 0 ? theme.success : theme.error }]}>
          {Math.abs(Math.round(remaining))} kcal {remaining >= 0 ? t('home.remaining') : t('home.over')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 12,
  },
  card: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caloriesCard: {
    backgroundColor: '#4CAF50',
  },
  proteinCard: {
    backgroundColor: '#2196F3',
  },
  carbsCard: {
    backgroundColor: '#FF9800',
  },
  fatCard: {
    backgroundColor: '#9C27B0',
  },
  cardLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  remainingContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  remainingText: {
    fontSize: 16,
    fontWeight: '700',
  },
});