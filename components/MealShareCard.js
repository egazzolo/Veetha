import React, { forwardRef, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';

// Renders a fixed, light-themed card (big photo on top, macros below) meant
// to be captured off-screen via react-native-view-shot and shared as an
// image -- deliberately ignores the app's dark mode since a shared image
// should look the same no matter who opens it.
const MealShareCard = forwardRef(({ meal, t, onReady }, ref) => {
  // A meal's own image_url is only set for AI photo captures -- a
  // product logged from the food database (barcode scan, search, etc.)
  // instead carries its photo on the linked product, same fallback
  // MealsList.js uses everywhere else.
  const photoUrl = meal?.image_url || meal?.product?.image_url;
  const hasPhoto = !!photoUrl;

  // Both the meal photo and the footer logo have to have actually painted
  // before capture fires -- onLoadEnd only means the bitmap finished
  // decoding, not that the native view has drawn it yet, so firing capture
  // straight off onLoadEnd raced ahead of the logo's own paint and captured
  // a blank spot where it should be. Two rAFs after both are "loaded" gives
  // the native side a full commit+paint cycle before the screenshot.
  const [photoLoaded, setPhotoLoaded] = useState(!hasPhoto);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    if (!photoLoaded || !logoLoaded) return;
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => onReady?.());
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [photoLoaded, logoLoaded]);

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.photoFrame}>
        {hasPhoto && (
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            resizeMode="cover"
            onLoadEnd={() => setPhotoLoaded(true)}
            onError={() => setPhotoLoaded(true)}
          />
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {meal?.product_name}
        </Text>

        <View style={styles.caloriesRow}>
          <Text style={styles.caloriesValue}>{Math.round(meal?.calories || 0)}</Text>
          <Text style={styles.caloriesLabel}>{t('home.kcal')}</Text>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroItem}>
            <AppIcon name="protein" size={20} tintColor="#A0522D" />
            <Text style={styles.macroValue}>{Math.round(meal?.protein || 0)}g</Text>
            <Text style={styles.macroLabel}>{t('home.protein')}</Text>
          </View>
          <View style={styles.macroItem}>
            <AppIcon name="carbs" size={20} tintColor="#DAA520" />
            <Text style={styles.macroValue}>{Math.round(meal?.carbs || 0)}g</Text>
            <Text style={styles.macroLabel}>{t('home.carbs')}</Text>
          </View>
          <View style={styles.macroItem}>
            <AppIcon name="fat" size={20} tintColor="#1F9B39" />
            <Text style={styles.macroValue}>{Math.round(meal?.fat || 0)}g</Text>
            <Text style={styles.macroLabel}>{t('home.fat')}</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Image
            source={require('../assets/adaptive-icon.png')}
            style={styles.footerLogo}
            resizeMode="contain"
            onLoadEnd={() => setLogoLoaded(true)}
            onError={() => setLogoLoaded(true)}
          />
          <Text style={styles.footer}>Logged with Meal Break</Text>
        </View>
      </View>
    </View>
  );
});

export default MealShareCard;

const CARD_WIDTH = 360;
const PHOTO_PADDING = 20;
const PHOTO_SIZE = CARD_WIDTH - PHOTO_PADDING * 2;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    // Same beige as the app's own light-theme background (theme.background
    // in ThemeContext.js) -- keeps the shared card visually on-brand instead
    // of a plain white card.
    backgroundColor: '#EAE0C8',
    borderRadius: 20,
    overflow: 'hidden',
  },
  photoFrame: {
    padding: PHOTO_PADDING,
    paddingBottom: PHOTO_PADDING - 4,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 14,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  caloriesLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerLogo: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  footer: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
  },
});
