import React from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useLayout } from '../utils/LayoutContext';
import { Svg, Circle } from 'react-native-svg';

// Mini Circular Progress for Preview
function MiniCircularProgress({ percentage, size = 40, strokeWidth = 4, color = '#fff', children }) {
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

export default function DisplaySettingsScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const { layout, changeLayout } = useLayout();

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('displaySettings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Home Screen Layout */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('displaySettings.homeScreenLayout')}</Text>
          
          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segment,
                layout === 'bars' && styles.segmentActive,
                layout === 'bars' && { backgroundColor: '#4CAF50' }
              ]}
              onPress={() => changeLayout('bars')}
            >
              <Text style={[
                styles.segmentText,
                layout === 'bars' && styles.segmentTextActive
              ]}>
                {t('displaySettings.progressBars')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.segment,
                layout === 'cards' && styles.segmentActive,
                layout === 'cards' && { backgroundColor: '#2196F3' }
              ]}
              onPress={() => changeLayout('cards')}
            >
              <Text style={[
                styles.segmentText,
                layout === 'cards' && styles.segmentTextActive
              ]}>
                {t('displaySettings.cardGrid')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={[styles.layoutDescription, { color: theme.textSecondary }]}>
            {layout === 'bars' 
              ? t('displaySettings.barsDescription')
              : t('displaySettings.cardsDescription')}
          </Text>

          {/* Preview Section */}
          <View style={[styles.previewBox, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>{t('displaySettings.preview')}</Text>
            
            {layout === 'bars' ? (
              <View style={styles.previewContent}>
                {/* Protein Bar */}
                <View style={styles.previewBarRow}>
                  <Text style={[styles.previewBarLabel, { color: theme.text }]}>Protein</Text>
                  <View style={styles.previewBarContainer}>
                    <View style={[styles.previewBar, { backgroundColor: theme.border }]}>
                      <View style={[styles.previewBarFill, { backgroundColor: '#2196F3', width: '60%' }]} />
                    </View>
                    <Text style={[styles.previewBarValue, { color: theme.textSecondary }]}>89/150g</Text>
                  </View>
                </View>

                {/* Carbs Bar */}
                <View style={styles.previewBarRow}>
                  <Text style={[styles.previewBarLabel, { color: theme.text }]}>Carbs</Text>
                  <View style={styles.previewBarContainer}>
                    <View style={[styles.previewBar, { backgroundColor: theme.border }]}>
                      <View style={[styles.previewBarFill, { backgroundColor: '#FF9800', width: '78%' }]} />
                    </View>
                    <Text style={[styles.previewBarValue, { color: theme.textSecondary }]}>156/200g</Text>
                  </View>
                </View>

                {/* Fat Bar */}
                <View style={styles.previewBarRow}>
                  <Text style={[styles.previewBarLabel, { color: theme.text }]}>Fat</Text>
                  <View style={styles.previewBarContainer}>
                    <View style={[styles.previewBar, { backgroundColor: theme.border }]}>
                      <View style={[styles.previewBarFill, { backgroundColor: '#9C27B0', width: '45%' }]} />
                    </View>
                    <Text style={[styles.previewBarValue, { color: theme.textSecondary }]}>45/65g</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.previewGrid}>
                <View style={[styles.previewCard, { backgroundColor: '#4CAF50' }]}>
                  <MiniCircularProgress percentage={75} size={45} strokeWidth={4} color="#fff">
                    <Text style={styles.previewCardNumber}>1847</Text>
                  </MiniCircularProgress>
                  <Text style={styles.previewCardText}>{t('displaySettings.calories')}</Text>
                </View>
                <View style={[styles.previewCard, { backgroundColor: '#2196F3' }]}>
                  <MiniCircularProgress percentage={60} size={45} strokeWidth={4} color="#fff">
                    <Text style={styles.previewCardNumber}>89g</Text>
                  </MiniCircularProgress>
                  <Text style={styles.previewCardText}>{t('displaySettings.protein')}</Text>
                </View>
                <View style={[styles.previewCard, { backgroundColor: '#FF9800' }]}>
                  <MiniCircularProgress percentage={78} size={45} strokeWidth={4} color="#fff">
                    <Text style={styles.previewCardNumber}>156g</Text>
                  </MiniCircularProgress>
                  <Text style={styles.previewCardText}>{t('displaySettings.carbs')}</Text>
                </View>
                <View style={[styles.previewCard, { backgroundColor: '#9C27B0' }]}>
                  <MiniCircularProgress percentage={45} size={45} strokeWidth={4} color="#fff">
                    <Text style={styles.previewCardNumber}>45g</Text>
                  </MiniCircularProgress>
                  <Text style={styles.previewCardText}>{t('displaySettings.fat')}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Info Note */}
        <View style={[styles.infoBox, { backgroundColor: theme.cardBackground }]}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            {t('displaySettings.infoText')}
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  layoutDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  previewBox: {
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 15,
  },
  previewContent: {
    gap: 18,
  },
  previewBarRow: {
    gap: 8,
  },
  previewBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  previewBarValue: {
    fontSize: 10,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  previewCardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  previewCardText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 10,
  },
  previewCardNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});