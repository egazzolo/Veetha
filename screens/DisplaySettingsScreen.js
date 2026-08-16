import React from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { useLayout } from '../utils/LayoutContext';
import { posthog } from '../utils/posthog';
import { Svg, Circle } from 'react-native-svg';
import AppIcon from '../components/AppIcon';

const PREVIEW_MARKER_SIZE = 12;

// Matches the ring-tint-as-track treatment in components/CardsLayout.js so
// this preview stays visually in sync with the real Home screen.
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Mini Circular Progress for Preview
function MiniCircularProgress({ percentage, size = 40, strokeWidth = 4, color = '#fff', trackColor = 'rgba(128,128,128,0.25)', children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          stroke={trackColor}
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
  const { theme, isDark, currentTheme, changeTheme } = useTheme();
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

        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Theme</Text>

          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                currentTheme === 'modern-light' && styles.themeOptionActive,
              ]}
              onPress={() => { posthog.capture('theme_changed', { theme: 'modern-light' }); changeTheme('modern-light'); }}
            >
              <View style={[styles.themeSwatch, { backgroundColor: '#EAE0C8' }]}>
                <View style={[styles.themeSwatchDot, { backgroundColor: '#1F9B39' }]} />
              </View>
              <Text style={[styles.themeOptionLabel, { color: theme.text }]}>Light</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                currentTheme === 'modern-dark' && styles.themeOptionActive,
              ]}
              onPress={() => { posthog.capture('theme_changed', { theme: 'modern-dark' }); changeTheme('modern-dark'); }}
            >
              <View style={[styles.themeSwatch, { backgroundColor: '#000000' }]}>
                <View style={[styles.themeSwatchDot, { backgroundColor: '#66BB6A' }]} />
              </View>
              <Text style={[styles.themeOptionLabel, { color: theme.text }]}>Dark</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                currentTheme === 'pro-mode' && styles.themeOptionActive,
              ]}
              onPress={() => { posthog.capture('theme_changed', { theme: 'pro-mode' }); changeTheme('pro-mode'); }}
            >
              <View style={[styles.themeSwatch, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0' }]}>
                <View style={[styles.themeSwatchDot, { backgroundColor: '#1F9B39' }]} />
              </View>
              <Text style={[styles.themeOptionLabel, { color: theme.text }]}>Pro Mode</Text>
            </TouchableOpacity> */}
          </View>

          <Text style={[styles.layoutDescription, { color: theme.textSecondary }]}>
            {currentTheme === 'modern-light' && 'Warm beige with green accents.'}
            {currentTheme === 'modern-dark' && 'Pure black with green accents.'}
            {/* {currentTheme === 'pro-mode' && 'Minimal black, white, and grey with a single green accent.'} */}
          </Text>
        </View>

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
              onPress={() => { posthog.capture('layout_changed', { layout: 'bars' }); changeLayout('bars'); }}
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
              onPress={() => { posthog.capture('layout_changed', { layout: 'cards' }); changeLayout('cards'); }}
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
                    <View style={styles.previewBarWrapper}>
                      <View style={[styles.previewBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.previewBarFill, { backgroundColor: '#2196F3', width: '60%' }]} />
                      </View>
                      <View style={[styles.previewBarMarker, { left: '60%' }]}>
                        <AppIcon name="chicken" size={PREVIEW_MARKER_SIZE} />
                      </View>
                    </View>
                    <Text style={[styles.previewBarValue, { color: '#2196F3' }]}>89/150g</Text>
                  </View>
                </View>

                {/* Carbs Bar */}
                <View style={styles.previewBarRow}>
                  <Text style={[styles.previewBarLabel, { color: theme.text }]}>Carbs</Text>
                  <View style={styles.previewBarContainer}>
                    <View style={styles.previewBarWrapper}>
                      <View style={[styles.previewBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.previewBarFill, { backgroundColor: '#FF9800', width: '78%' }]} />
                      </View>
                      <View style={[styles.previewBarMarker, { left: '78%' }]}>
                        <AppIcon name="bread" size={PREVIEW_MARKER_SIZE} />
                      </View>
                    </View>
                    <Text style={[styles.previewBarValue, { color: '#FF9800' }]}>156/200g</Text>
                  </View>
                </View>

                {/* Fat Bar */}
                <View style={styles.previewBarRow}>
                  <Text style={[styles.previewBarLabel, { color: theme.text }]}>Fat</Text>
                  <View style={styles.previewBarContainer}>
                    <View style={styles.previewBarWrapper}>
                      <View style={[styles.previewBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.previewBarFill, { backgroundColor: '#9C27B0', width: '45%' }]} />
                      </View>
                      <View style={[styles.previewBarMarker, { left: '45%' }]}>
                        <AppIcon name="avocado" size={PREVIEW_MARKER_SIZE} />
                      </View>
                    </View>
                    <Text style={[styles.previewBarValue, { color: '#9C27B0' }]}>45/65g</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.previewGrid}>
                <View style={styles.previewCard}>
                  <MiniCircularProgress percentage={75} size={50} strokeWidth={5} color="#4CAF50" trackColor={hexToRgba('#4CAF50', 0.18)}>
                    <Text style={[styles.previewCardNumber, { color: theme.text }]}>1847</Text>
                    <Text style={[styles.previewCardGoal, { color: theme.textSecondary }]}>/2200</Text>
                  </MiniCircularProgress>
                  <Text style={[styles.previewCardText, { color: theme.text }]}>{t('displaySettings.calories')}</Text>
                </View>
                <View style={styles.previewCard}>
                  <MiniCircularProgress percentage={60} size={42} strokeWidth={4} color="#2196F3" trackColor={hexToRgba('#2196F3', 0.18)}>
                    <Text style={[styles.previewCardNumber, { color: theme.text }]}>89</Text>
                    <Text style={[styles.previewCardGoal, { color: theme.textSecondary }]}>/150g</Text>
                  </MiniCircularProgress>
                  <Text style={[styles.previewCardText, { color: theme.text }]}>{t('displaySettings.protein')}</Text>
                </View>
                <View style={styles.previewCard}>
                  <MiniCircularProgress percentage={78} size={42} strokeWidth={4} color="#FF9800" trackColor={hexToRgba('#FF9800', 0.18)}>
                    <Text style={[styles.previewCardNumber, { color: theme.text }]}>156</Text>
                    <Text style={[styles.previewCardGoal, { color: theme.textSecondary }]}>/200g</Text>
                  </MiniCircularProgress>
                  <Text style={[styles.previewCardText, { color: theme.text }]}>{t('displaySettings.carbs')}</Text>
                </View>
                <View style={styles.previewCard}>
                  <MiniCircularProgress percentage={45} size={42} strokeWidth={4} color="#9C27B0" trackColor={hexToRgba('#9C27B0', 0.18)}>
                    <Text style={[styles.previewCardNumber, { color: theme.text }]}>45</Text>
                    <Text style={[styles.previewCardGoal, { color: theme.textSecondary }]}>/65g</Text>
                  </MiniCircularProgress>
                  <Text style={[styles.previewCardText, { color: theme.text }]}>{t('displaySettings.fat')}</Text>
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
  previewBarWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  previewBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Mirrors components/BarsLayout.js's marker treatment -- sits on top of the
  // (overflow: hidden) bar rather than inside it, positioned by percentage to
  // ride along the fill's leading edge.
  previewBarMarker: {
    position: 'absolute',
    top: -(PREVIEW_MARKER_SIZE - 6) / 2,
    marginLeft: -PREVIEW_MARKER_SIZE / 2,
    width: PREVIEW_MARKER_SIZE,
    height: PREVIEW_MARKER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'space-between',
    rowGap: 6,
  },
  previewCard: {
    width: '47%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
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
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
  },
  previewCardNumber: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  previewCardGoal: {
    fontSize: 7,
    textAlign: 'center',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  themeOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  themeOptionActive: {
    borderColor: '#1F9B39',
  },
  themeSwatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeSwatchDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  themeOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});