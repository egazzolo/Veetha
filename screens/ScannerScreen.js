import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Animated } from 'react-native';
import { CameraView } from 'expo-camera';
import { useTheme } from '../utils/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { useTutorial } from '../utils/TutorialContext';
import TutorialArrow from '../components/TutorialArrow';
import AppTutorial from '../components/AppTutorial';
import { logScreen, logEvent } from '../utils/analytics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSwipeNavigation } from '../utils/useSwipeNavigation';
import { searchFood } from '../utils/foodDatabase';
import { useUser, UserContext } from '../utils/UserContext';
import { analyzePhoto as analyzeClarifai, imageUriToBase64 as clarifaiToBase64 } from '../utils/clarifaiApi';
import { analyzePhoto as analyzeGoogle, imageUriToBase64 as googleToBase64 } from '../utils/visionApi';

const DAILY_PHOTO_LIMIT = 30;

// 🔄 API TOGGLE - Switch between Clarifai and Google Vision
const USE_GOOGLE_VISION = false; // ← Change to true when $4.99 runs out

export default function ScannerScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { tutorialCompleted, startTutorial } = useTutorial();
  const { refreshProfile } = useUser();
  const [showArrowToBack, setShowArrowToBack] = useState(false);
  const [backButtonCoords, setBackButtonCoords] = useState(null); 
  const cameraRef = useRef(null);
  const lastPhotoTime = useRef(0);

  const titleRef = useRef(null);
  const modeToggleRef = useRef(null);
  const captureButtonRef = useRef(null);
  const backButtonRef = useRef(null);

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showArrowToProfile, setShowArrowToProfile] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [mode, setMode] = useState('barcode');
  const [checkingTutorial, setCheckingTutorial] = useState(true);
  
  // Swipe navigation (only when camera is idle, not during scan)
  const swipeGesture = useSwipeNavigation(navigation, 'Scanner', mode === 'barcode' && !scanned);
  // 🎨 ANIMATION: Photo tips fade out after 3 seconds
  const photoTipsOpacity = useRef(new Animated.Value(1)).current;
  const [showPhotoTips, setShowPhotoTips] = useState(true);

  // Check number of Clarifai calls per month
  const checkMonthlyPhotoLimit = async (user) => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const apiName = USE_GOOGLE_VISION ? 'google_vision' : 'clarifai';
    const monthlyLimit = USE_GOOGLE_VISION ? 950 : 900; // Google: 950, Clarifai: 900

    const { data: monthlyPhotos, error } = await supabase
      .from('api_tracking')
      .select('id')
      .eq('user_id', user.id)
      .eq('service', apiName)  // ← Dynamic API name
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59');

    if (error) {
      console.error('Error checking photo limit:', error);
    } else {
      const photosUsed = monthlyPhotos?.length || 0;

      // Check if limit reached
      if (photosUsed >= monthlyLimit) {
        Alert.alert(
          'Monthly Limit Reached',
          `You've used all ${monthlyLimit} photo requests for this month using ${USE_GOOGLE_VISION ? 'Google Vision' : 'Clarifai'}. Try again tomorrow!`
        );
        return;
      }

      // ⚠️ WARNING when near limit
      if (photosUsed >= monthlyLimit - 50) {
        Alert.alert(
          'Low on Photo Scans',
          `⚠️ You have ${monthlyLimit - photosUsed} photo requests left this month.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => proceedWithPhotoCapture() }
          ]
        );
        return;
      }
    }

    if (error) {
      console.error('Error checking photo limit:', error);
      return true; // Allow on error
    }

    const photosUsedThisMonth = monthlyPhotos?.length || 0;
    const MONTHLY_LIMIT = 900; // Leave buffer under 1000

    console.log(`📸 Photo usage: ${photosUsedThisMonth}/${MONTHLY_LIMIT} this month`);

    if (photosUsedThisMonth >= MONTHLY_LIMIT) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const resetDate = nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      
      Alert.alert(
        'Monthly Limit Reached',
        `You've used all ${MONTHLY_LIMIT} photo scans for this month. Your limit resets on ${resetDate}.\n\nTip: Use barcode scanning for packaged foods (unlimited!)`,
        [{ text: 'OK' }]
      );
      return false;
    }

    // Warn at 850 uses (50 left)
    if (photosUsedThisMonth >= 850) {
      Alert.alert(
        'Low on Photo Scans',
        `You've used ${photosUsedThisMonth}/${MONTHLY_LIMIT} scans. ${MONTHLY_LIMIT - photosUsedThisMonth} remaining this month.`,
        [{ text: 'OK' }]
      );
    }

    return true;
  };

  // Measure back button for arrow
  const measureBackButton = () => {
    if (backButtonRef.current) {
      backButtonRef.current.measureInWindow((x, y, w, h) => {
        console.log('📍 Back button coords:', { x, y, w, h });
        setBackButtonCoords({ top: y, left: x, width: w, height: h });
      });
    }
  };

  useEffect(() => {
    logScreen('Scanner');
  }, []);

  // Reset scanner state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📷 Scanner focused - resetting state');
      setScanned(false);
      setLoading(false);
      lastPhotoTime.current = 0;
    }, [])
  );
  
  // Check if tips should show and fade them out
  useEffect(() => {
    const checkAndShowTips = async () => {
      if (mode === 'photo') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setShowPhotoTips(false);
            return;
          }

          // Check how many times tips have been shown
          const { data: profile } = await supabase
            .from('profiles')
            .select('photo_tips_count')
            .eq('id', user.id)
            .single();

          const tipsCount = profile?.photo_tips_count || 0;

          if (tipsCount < 5) {
            // Show tips and increment counter
            setShowPhotoTips(true);
            photoTipsOpacity.setValue(1);

            // Increment counter in database
            await supabase
              .from('profiles')
              .update({ photo_tips_count: tipsCount + 1 })
              .eq('id', user.id);

            console.log(`📸 Photo tips shown: ${tipsCount + 1}/5`);

            // Fade out after 3 seconds
            const timer = setTimeout(() => {
              Animated.timing(photoTipsOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }).start(() => setShowPhotoTips(false));
            }, 3000);

            return () => clearTimeout(timer);
          } else {
            // Don't show tips anymore
            console.log('📸 Photo tips limit reached (5/5)');
            setShowPhotoTips(false);
          }
        } catch (error) {
          console.error('Error checking photo tips:', error);
          setShowPhotoTips(false);
        }
      } else if (mode === 'barcode') {
        // Reset when switching to barcode
        setShowPhotoTips(false);
        photoTipsOpacity.setValue(0);
      }
    };

    checkAndShowTips();
  }, [mode]);

  // Start tutorial on first visit to Scanner
  useEffect(() => {
    const checkScannerTutorial = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCheckingTutorial(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('scanner_tutorial_completed')
          .eq('id', user.id)
          .single();

        // If tutorial already completed, unfreeze immediately
        if (profile?.scanner_tutorial_completed) {
          console.log('✅ Scanner tutorial already completed - unfreezing');
          setCheckingTutorial(false);
          return;
        }

        // Tutorial needs to start - unfreeze and start
        console.log('🎓 Starting Scanner tutorial');
        setCheckingTutorial(false); // Unfreeze before tutorial
        setTimeout(() => startTutorial('Scanner'), 500);
        
      } catch (error) {
        console.error('Error checking scanner tutorial:', error);
        setCheckingTutorial(false); // Unfreeze on error
      }
    };

    checkScannerTutorial();
  }, []);

  // Request camera permission
  //if (!permission) {
  //  return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  //}

  //if (!permission.granted) {
  //  return (
  //    <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
  //      <Text style={[styles.permissionText, { color: theme.text }]}>
  //        {t('scanner.cameraPermission')}
  //      </Text>
  //      <TouchableOpacity
  //        style={[styles.permissionButton, { backgroundColor: theme.primary }]}
  //        onPress={requestPermission}
  //      >
  //        <Text style={styles.permissionButtonText}>{t('scanner.grantPermission')}</Text>
  //      </TouchableOpacity>
  //    </View>
  //  );
  //}

  // Fetch food info from OpenFoodFacts
  const fetchFoodInfo = async (barcode) => {
    try {
      setLoading(true);
      console.log("🔍 Fetching product with barcode:", barcode);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response;
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) throw error;
          console.log(`⚠️ Attempt ${attempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        console.log("✅ Product found:", p.product_name);

        let imageUrl = p.image_url || p.image_front_url || p.image_front_small_url;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://world.openfoodfacts.org${imageUrl}`;
        }
        p.image_url = imageUrl;

        // Log API call
        await logApiCall('openfoodfacts', 'barcode_scan', true, null, {
          barcode: barcode,
          product_name: p.product_name
        });

        console.log("✅ Navigating to Result...");
        navigation.navigate("Result", { 
          food: p,
          fromMode: 'barcode' 
        });
      } else {
        console.log("❌ Product not found in database");
        Alert.alert(
          t('scanner.productNotFound'),
          t('scanner.notInDatabase'),
          [
            { text: t('scanner.ok'), onPress: () => setScanned(false) },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error fetching food info:', error);
      Alert.alert(
        t('scanner.error'),
        t('scanner.errorMessage'),
        [
          { text: t('scanner.ok'), onPress: () => setScanned(false) },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Log API call to Supabase
  const logApiCall = async (service, callType, success, errorMessage = null, metadata = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('api_tracking').insert({  // ← FIXED TABLE NAME
        user_id: user?.id || null,
        service: service,  // ← Changed from api_service
        type: callType,    // ← Changed from call_type
        success: success,
        error_message: errorMessage,
        metadata: metadata
      });
      
      if (error) {
        console.error('❌ Failed to log API call:', error);
      } else {
        console.log(`📊 Logged API call: ${service} - ${callType} - ${success ? 'SUCCESS' : 'FAILED'}`);
      }
    } catch (error) {
      console.error('❌ Exception logging API call:', error);
    }
  };

  // Analyze food photo with AI (Clarifai or Google Vision)
  const analyzeFoodPhoto = async (photoUri) => {
    try {
      setLoading(true);
      console.log(`📸 Analyzing food photo with ${USE_GOOGLE_VISION ? 'Google Vision' : 'Clarifai'}...`);

      // Convert image to base64
      const imageToBase64 = USE_GOOGLE_VISION ? googleToBase64 : clarifaiToBase64;
      const base64 = await imageToBase64(photoUri);
      
      // Analyze with selected API
      const analyzePhoto = USE_GOOGLE_VISION ? analyzeGoogle : analyzeClarifai;
      const result = await analyzePhoto(base64);
      
      const foodName = result.foodName;
      const confidence = result.confidence;

      console.log(`🍽️ Detected: ${foodName} (${confidence}% confidence)`);

      // ✅ CONFIDENCE THRESHOLD CHECK
      if (confidence < 60) {
        const apiName = USE_GOOGLE_VISION ? 'google_vision' : 'clarifai';
        await logApiCall(apiName, 'food_recognition', false, 'Low confidence', {
          detected_food: foodName,
          confidence: confidence
        });

        Alert.alert(
          t('scanner.lowConfidence'),
          t('scanner.lowConfidenceMessage').replace('{food}', foodName).replace('{confidence}', confidence),
          [
            {
              text: t('scanner.retakePhoto'),
              onPress: () => {
                setScanned(false);
                setLoading(false);
              }
            },
            {
              text: t('scanner.continueAnyway'),
              onPress: () => proceedWithFood(foodName, confidence, photoUri),
              style: 'cancel'
            }
          ]
        );
        return;
      }

      await proceedWithFood(foodName, confidence, photoUri);

    } catch (error) {
      console.error('❌ Error analyzing photo:', error);
      Alert.alert(
        t('scanner.error'),
        error.message || t('scanner.photoAnalysisFailed'),
        [
          {
            text: 'OK',
            onPress: () => {
              setLoading(false);
              setScanned(false);
            },
          },
        ]
      );
    }
  };

  // Proceed with food after confidence check
  const proceedWithFood = async (foodName, confidence, photoUri) => {
    try {
      const apiName = USE_GOOGLE_VISION ? 'google_vision' : 'clarifai';
      await logApiCall(apiName, 'food_recognition', true, null, {
        detected_food: foodName,
        confidence: confidence,
        total_concepts: 1,
      });

      console.log('🔍 Searching for nutrition data...');

      // ✅ SEARCH FOR NUTRITION DATA (local DB + USDA)
      const nutritionData = await searchFood(foodName);

      let detectedFood;

      if (nutritionData) {
        // Found nutrition data!
        console.log('✅ Nutrition data found:', nutritionData.source);
        
        detectedFood = {
          product_name: nutritionData.name || foodName,
          image_url: photoUri,
          nutriments: nutritionData.nutriments,
          detected_by_ai: true,
          ai_detected_name: foodName, // Original AI detection
          confidence: confidence,
          nutrition_source: nutritionData.source,
          usda_fdc_id: nutritionData.fdcId || null,
          ai_message: `${t('scanner.aiDetected')} "${foodName}" (${confidence}% ${t('scanner.confidence')}). ${t('scanner.pleaseVerify')}`
        };
      } else {
        // No nutrition data found - user will need to enter manually
        console.log('⚠️ No nutrition data found');
        
        detectedFood = {
          product_name: foodName,
          image_url: photoUri,
          nutriments: {
            'energy-kcal': 0,
            proteins: 0,
            carbohydrates: 0,
            fat: 0,
          },
          detected_by_ai: true,
          ai_detected_name: foodName,
          confidence: confidence,
          nutrition_source: 'user_input',
          ai_message: `${t('scanner.aiDetected')} "${foodName}" (${confidence}% ${t('scanner.confidence')}). ${t('scanner.nutritionNotFound')}`
        };
      }

      setLoading(false);
      setScanned(false);
      navigation.navigate("Result", { 
        food: detectedFood, 
        fromMode: 'photo'
      });

    } catch (error) {
      console.error('❌ Error in proceedWithFood:', error);
      Alert.alert(t('scanner.error'), error.message);
      setLoading(false);
      setScanned(false);
    }
  };

  // Take photo using the camera
  const takePhoto = async () => {
    if (!cameraRef.current || loading) return;

    try {
      // ⏱️ RATE LIMIT CHECK (3 seconds between photos)
      const now = Date.now();
      if (now - lastPhotoTime.current < 3000) {
        Alert.alert(t('scanner.error'), 'Please wait a moment between photos.');
        return;
      }

      // 📊 DAILY LIMIT CHECK
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayPhotos, error } = await supabase
          .from('api_tracking')
          .select('id')
          .eq('user_id', user.id)
          .eq('service', 'clarifai')
          .eq('type', 'food_recognition')
          .gte('created_at', today + 'T00:00:00')
          .lte('created_at', today + 'T23:59:59');

        if (error) {
          console.error('Error checking photo limit:', error);
        } else {
          const photosUsed = todayPhotos?.length || 0;

          // Check if limit reached
          if (photosUsed >= DAILY_PHOTO_LIMIT) {
            Alert.alert(
              'Daily Limit Reached',
              `You've used all ${DAILY_PHOTO_LIMIT} photo requests for today. Try again tomorrow!`
            );
            return;
          }

          // ⚠️ WARNING when 1 request left
          if (photosUsed === DAILY_PHOTO_LIMIT - 1) {
            Alert.alert(
              'Last Request',
              `⚠️ You have 1 photo request left today.`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Continue',
                  onPress: () => proceedWithPhotoCapture(),
                },
              ]
            );
            return;
          }
        }
      }

      // If all checks pass, take photo
      await proceedWithPhotoCapture();

    } catch (error) {
      console.error('Error in takePhoto:', error);
      Alert.alert(t('scanner.error'), error.message);
    }
  };

  // 📸 ACTUAL PHOTO CAPTURE (separated for the "Continue" button)
  const proceedWithPhotoCapture = async () => {
    try {
      lastPhotoTime.current = Date.now();
      setLoading(true);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      console.log("📸 Photo captured:", photo.uri);
      logEvent('photo_scanned');
      await analyzeFoodPhoto(photo.uri);
      
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('scanner.error'), t('scanner.cameraFailed'));
      setLoading(false);
    }
  };

  // Handle barcode scan
  const handleBarcodeScanned = ({ data }) => {
    if (scanned || mode !== 'barcode') return;
    
    setScanned(true);
    console.log("📊 Barcode scanned:", data);
    logEvent('barcode_scanned', { barcode: data });
    fetchFoodInfo(data);
  };

  // Manual barcode entry
  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      setShowManualInput(false);
      fetchFoodInfo(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  // Toggle between barcode and photo mode
  const toggleMode = () => {
    setMode(prev => prev === 'barcode' ? 'photo' : 'barcode');
    setScanned(false);
  };

  return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <GestureDetector gesture={swipeGesture}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.container}>
          {/* Camera View */}
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={mode === 'barcode' ? {
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            } : undefined}
            onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                ref={backButtonRef}  // ← Add ref
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>✕</Text>
              </TouchableOpacity>

              <Text ref={titleRef} style={styles.title}>
                {mode === 'barcode' ? t('scanner.scanBarcode') : t('scanner.scanFood')}
              </Text>

              {/* Mode Toggle Button */}
              <TouchableOpacity
                ref={modeToggleRef}
                style={[
                  styles.modeToggle,
                  { backgroundColor: mode === 'barcode' ? '#4CAF50' : '#2196F3' }
                ]}
                onPress={toggleMode}
              >
                <Text style={styles.modeToggleText}>
                  {mode === 'barcode' ? '📊' : '📷'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scanning Overlay */}
            {mode === 'barcode' ? (
              // Barcode Mode
              <View style={styles.overlay}>
                <View style={styles.focusFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.instruction}>{t('scanner.barcodeInstruction')}</Text>
              </View>
            ) : (
              // Photo Mode
              <View style={styles.overlay}>
                <View style={styles.photoFrame} />
                {showPhotoTips && (
                  <Animated.View style={[styles.photoTipsContainer, { opacity: photoTipsOpacity }]}>
                    <Text style={styles.photoInstruction}>{t('scanner.photoInstruction')}</Text>
                    <View style={styles.photoTips}>
                      <Text style={styles.photoTip}>✓ {t('scanner.photoTip1')}</Text>
                      <Text style={styles.photoTip}>✓ {t('scanner.photoTip2')}</Text>
                      <Text style={styles.photoTip}>✓ {t('scanner.photoTip3')}</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            )}

            {/* Bottom Buttons */}
            <View style={styles.bottomControls}>
              {mode === 'barcode' ? (
                <TouchableOpacity
                  style={styles.manualButton}
                  onPress={() => setShowManualInput(true)}
                >
                  <Text style={styles.manualButtonText}>🔢 {t('scanner.typeBarcode')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  ref={captureButtonRef}
                  style={styles.captureButton}
                  onPress={takePhoto}
                  disabled={loading}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
              )}
            </View>

            {/* Loading Overlay */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color="#4CAF50" />
                  <Text style={styles.loadingText}>
                    {mode === 'barcode' ? t('scanner.loadingNutrition') : t('scanner.analyzingPhoto')}
                  </Text>
                </View>
              </View>
            )}
          </CameraView>

          {/* Manual Barcode Input Modal */}
          <Modal
            visible={showManualInput}
            transparent
            animationType="slide"
            onRequestClose={() => setShowManualInput(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {t('scanner.enterBarcode')}
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder={t('scanner.barcodePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  value={manualBarcode}
                  onChangeText={setManualBarcode}
                  keyboardType="numeric"
                  autoFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowManualInput(false);
                      setManualBarcode('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>{t('scanner.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                    onPress={handleManualSubmit}
                  >
                    <Text style={styles.submitButtonText}>{t('scanner.submit')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* Tutorial */}
          <AppTutorial 
            screen="Scanner"
            mode={mode}
            setMode={setMode}
            onComplete={() => {
              console.log('📸 Scanner tutorial complete');
              measureBackButton();
              setShowArrowToBack(true);
            }}
            onProfileRefresh={refreshProfile}
            tutorialRefs={{
              title: titleRef,
              modeToggle: modeToggleRef,
              captureButton: captureButtonRef,
            }}
          />

          {backButtonCoords && (
            <TutorialArrow
              targetCoords={backButtonCoords}
              direction="left"
              onSkip={() => setShowArrowToBack(false)}
              message={t('tutorial.tapToExit')}
              visible={showArrowToBack}
            />
          )}
          {/* Freeze overlay during tutorial check */}
          {checkingTutorial && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          )}
        </View>
      </SafeAreaView>
    </GestureDetector>
  </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  // permissionContainer: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   padding: 20,
  // },
  // permissionText: {
  //   fontSize: 18,
  //   textAlign: 'center',
  //   marginBottom: 20,
  // },
  // permissionButton: {
  //   paddingHorizontal: 30,
  //   paddingVertical: 15,
  //   borderRadius: 10,
  // },
  // permissionButtonText: {
  //   color: '#fff',
  //   fontSize: 16,
  //   fontWeight: 'bold',
  // },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modeToggleText: {
    fontSize: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4CAF50',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 30,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  photoFrame: {
    width: 320,
    height: 320,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoInstruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  photoTips: {
    alignItems: 'flex-start',
  },
  photoTip: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  bottomControls: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  manualButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2196F3',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 25,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    // backgroundColor from theme.primary
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoTipsContainer: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    alignItems: 'center',
  },
});