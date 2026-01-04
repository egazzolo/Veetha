import React, { useState, useEffect } from 'react'; //E:
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, Image } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { useTutorial } from '../utils/TutorialContext';
import { useTheme } from '../utils/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function AppTutorial({ 
  screen, 
  tutorialRefs, 
  scrollViewRef, 
  mode, 
  setMode, 
  onComplete, 
  onProfileRefresh 
}) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { tutorialCompleted, currentStep, currentScreen, nextStep, skipTutorial } = useTutorial();
  const [visible, setVisible] = useState(false);
  const [stepConfig, setStepConfig] = useState([]);
  const [measuring, setMeasuring] = useState(false);
  const insets = useSafeAreaInsets();
  const [animFrame, setAnimFrame] = useState(0);
  const [animLoops, setAnimLoops] = useState(0);

  // Measure components when tutorial starts
  useEffect(() => {
    console.log('🎯 AppTutorial effect:', {
      currentScreen,
      screen,
      tutorialRefs,
      measuring,
    });
    
    // Only check if currentScreen matches - startTutorial already checked the flags
    if (currentScreen === screen && tutorialRefs && !measuring) {
      console.log('✅ Starting measurement...');
      setMeasuring(true);
      measureAndCreateSteps();
    } else if (currentScreen !== screen) {
      console.log('❌ Not showing tutorial - wrong screen');
      setVisible(false);
      setStepConfig([]);
    }
  }, [currentScreen, screen]);

  useEffect(() => {
    if (!visible || !stepConfig[currentStep]?.images) return;
    
    const step = stepConfig[currentStep];
    const frameCount = step.images.length;
    const maxLoops = step.loops || 3;
    
    const interval = setInterval(() => {
      setAnimFrame(prev => {
        const nextFrame = prev + 1;
        
        // Check if we completed a loop
        if (nextFrame >= frameCount) {
          setAnimLoops(loops => {
            const newLoops = loops + 1;
            
            // Stop after max loops
            if (newLoops >= maxLoops) {
              clearInterval(interval);
              return loops;
            }
            return newLoops;
          });
          return 0; // Reset to first frame
        }
        
        return nextFrame;
      });
    }, 1500); // Change frame every 500ms
    
    return () => clearInterval(interval);
  }, [visible, currentStep]);

  // Reset animation when step changes
  useEffect(() => {
    setAnimFrame(0);
    setAnimLoops(0);
  }, [currentStep]);

  const measureAndCreateSteps = async () => {
    console.log('📏 Starting measurements...');
    console.log('📏 Refs available:', {
      caloriesCard: !!tutorialRefs.caloriesCard?.current,
      macroCards: !!tutorialRefs.macroCards?.current,
      mealsList: !!tutorialRefs.mealsList?.current,
      scannerButton: !!tutorialRefs.scannerButton?.current,
    });
    
    try {
      const steps = [];

      await new Promise(resolve => setTimeout(resolve, 500)); // 1.5 second delay
      console.log('✅ Layout settled, starting measurements...');

      // Step 1: Calories Card - BUBBLE ABOVE, ARROW DOWN
      console.log('📏 Measuring caloriesCard...');
      if (tutorialRefs.caloriesCard?.current) {
        const coords = await measureComponent(tutorialRefs.caloriesCard.current);
        console.log('📏 caloriesCard coords:', coords);
        if (coords) {
          steps.push({
            targetArea: coords,
            bubblePosition: {
              top: coords.top - 210,  // ABOVE the card
              left: 20,
              maxWidth: width - 40,
            },
            arrow: {
              direction: 'down',  // Arrow points DOWN at card
              position: (coords.left + coords.width / 2) - 20 - 15,
            },
            title: t('tutorial.home.step1.title'),
            content: t('tutorial.home.step1.content'),
          });
        }
      }

      // Step 2: All 3 Macro Cards (Protein, Carbs, Fat)
      console.log('📏 Measuring macroCards...');
      if (tutorialRefs.macroCards?.current && tutorialRefs.caloriesCard?.current) {
        const gridCoords = await measureComponent(tutorialRefs.macroCards.current);
        const caloriesCoords = await measureComponent(tutorialRefs.caloriesCard.current);
        
        console.log('📏 macroCards grid coords:', gridCoords);
        console.log('📏 caloriesCard coords for reference:', caloriesCoords);
        
        if (gridCoords && caloriesCoords) {
          const cardWidth = (gridCoords.width - 12) / 2;  // Width of one card
          const cardHeight = caloriesCoords.height;  // Height of one card
          const gap = 12;
          
          // Protein card (top-right) - SAME ROW as calories
          const proteinCard = {
            top: caloriesCoords.top,  // Same top as calories
            left: caloriesCoords.left + caloriesCoords.width + gap,
            width: cardWidth,
            height: cardHeight,
            borderRadius: 16,
          };

          // Carbs card (bottom-left)
          const carbsCard = {
            top: caloriesCoords.top + caloriesCoords.height + gap,  // Below calories
            left: gridCoords.left,
            width: cardWidth,
            height: cardHeight,
            borderRadius: 16,
          };

          // Fat card (bottom-right) - SAME ROW as carbs
          const fatCard = {
            top: caloriesCoords.top + caloriesCoords.height + gap,  // Same top as carbs
            left: caloriesCoords.left + caloriesCoords.width + gap,
            width: cardWidth,
            height: cardHeight,
            borderRadius: 16,
          };

          console.log('📏 Calculated highlights:', { proteinCard, carbsCard, fatCard });
          
          steps.push({
            targetArea: proteinCard,  // Main highlight on Protein
            extraHighlights: [carbsCard, fatCard],  // Extra highlights on Carbs & Fat
            bubblePosition: {
              top: gridCoords.top - 220,  // Above all cards
              left: 20,
              maxWidth: width - 40,
            },
            arrow: {
              direction: 'down',
              position: (gridCoords.left + gridCoords.width / 4) + 165 - 15,
            },
            title: t('tutorial.home.step2.title'),
            content: t('tutorial.home.step2.content'),
          });
        }
      }

      // Step 3: Meals List - BUBBLE AT TOP, ARROW DOWN
      console.log('📏 Measuring mealsList...');
      if (tutorialRefs.mealsList?.current) {   
        const coords = await measureComponent(tutorialRefs.mealsList.current);
        console.log('📏 mealsList coords:', coords);
        if (coords) {
          steps.push({
            targetArea: coords,
            bubblePosition: {
              top: 160,
              left: 20,
              maxWidth: width - 40,
            },
            arrow: {
              direction: 'down',
              position: (coords.left + coords.width / 2) - 20 - 15,
            },
            title: t('tutorial.home.step3.title'),
            content: t('tutorial.home.step3.content'),
            scrollTo: coords.top - 200,  // Scroll to show meals list
          });
        }
      }

      // Step 4: Scanner Button
      console.log('📏 Measuring scannerButton...');
      if (tutorialRefs.scannerButton?.current) {
        const coords = await measureComponent(tutorialRefs.scannerButton.current);
        console.log('📏 scannerButton coords:', coords);
        if (coords) {
          steps.push({
            targetArea: coords,
            bubblePosition: {
              top: coords.top - 230,
              left: 20,
              maxWidth: width - 40,
            },
            arrow: {
              direction: 'down',
              position: (coords.left + coords.width / 2) - 20 - 15,
            },
            title: t('tutorial.home.step4.title'),
            content: t('tutorial.home.step4.content'),
          });
        }
      }

      // Scanner Screen Steps
      if (screen === 'Scanner') {
        console.log('📏 Starting Scanner measurements...', { mode });
        
        // Step 1: Barcode Scanner (only in barcode mode)
        if (tutorialRefs.title?.current) {
          const titleCoords = await measureComponent(tutorialRefs.title.current);
          console.log('📏 title coords:', titleCoords);
          
          if (titleCoords) {
            steps.push({
              targetArea: {
                top: titleCoords.top - 20,
                left: titleCoords.left - 20,
                width: titleCoords.width + 40,
                height: titleCoords.height + 40,
                borderRadius: 12,
              },
              bubblePosition: {
                top: titleCoords.top + titleCoords.height + 60,
                left: 20,
                maxWidth: width - 40,
              },
              title: t('tutorial.scanner.step1.title'),
              content: t('tutorial.scanner.step1.content'),
              images: [
                require('../assets/scanner_demo_1.png'),
                require('../assets/scanner_demo_2.png'),
                require('../assets/scanner_demo_3.png'),
              ],
              loops: 3,
              requireMode: 'barcode',
            });
          }
        }
        
        // Step 2: Mode Toggle Button
        if (tutorialRefs.modeToggle?.current) {
          const toggleCoords = await measureComponent(tutorialRefs.modeToggle.current);
          console.log('📏 modeToggle coords:', toggleCoords);
          
          if (toggleCoords) {
            steps.push({
              targetArea: toggleCoords,
              bubblePosition: {
                top: toggleCoords.top + toggleCoords.height + 20,
                left: 20,
                maxWidth: width - 40,
              },
              arrow: {
                direction: 'up',
                position: (toggleCoords.left + toggleCoords.width / 2) - 20 - 15,
              },
              title: t('tutorial.scanner.step2.title'),
              content: t('tutorial.scanner.step2.content'),
              requireMode: 'barcode',
              switchModeOnNext: true, // New flag instead of interactive
            });
          }
        }
        
        // Step 3: Photo Capture Button - Calculated from stylesheet
        const bottomPadding = 50;    // From bottomControls paddingBottom
        const buttonHeight = 80;     // From captureButton height
        const buttonTop = height - bottomPadding - buttonHeight - 7;

        steps.push({
          targetArea: {
            top: buttonTop - 40,
            left: (width / 2) - 40,
            width: 80,
            height: 80,
            borderRadius: 40,
          },
          bubblePosition: {
            top: 80,  // Fixed at top of screen
            left: 20,
            maxWidth: width - 40,
          },
          arrow: {
            direction: 'down',
            position: (width / 2) - 20 - 15,
          },
          title: t('tutorial.scanner.step3.title'),
          content: t('tutorial.scanner.step3.content') + '\n\n' + t('tutorial.scanner.step4.content'),
          images: [
            require('../assets/images/camera_demo_1.png'),
            require('../assets/images/camera_demo_2.png'),
            require('../assets/images/camera_demo_3.png'),
            require('../assets/images/camera_demo_4.png'),
          ],
          loops: 3,
        });
      }
      // Profile Screen Steps
      if (screen === 'Profile') {
        console.log('📏 Starting Profile measurements...');
        
        // NO SCROLLING - measure everything where it is
        
        // Step 1: Stats Grid
        if (tutorialRefs.statsGrid?.current) {
          const statsCoords = await measureComponent(tutorialRefs.statsGrid.current);
          console.log('📏 statsGrid coords:', statsCoords);
          
          if (statsCoords) {
            steps.push({
              targetArea: statsCoords,
              bubblePosition: {
                top: statsCoords.top - 180,
                left: 20,
                maxWidth: width - 40,
              },
              arrow: {
                direction: 'down',
                position: (statsCoords.left + statsCoords.width / 2) - 20 - 15,
              },
              title: t('tutorial.profile.step1.title'),
              content: t('tutorial.profile.step1.content'),
            });
          }
        }

        // Step 2: Edit Button
        if (tutorialRefs.editButton?.current) {
          const editCoords = await measureComponent(tutorialRefs.editButton.current);
          console.log('📏 editButton coords:', editCoords);
          
          if (editCoords) {
            steps.push({
              targetArea: editCoords,
              bubblePosition: {
                top: editCoords.top + editCoords.height + 20,
                left: 20,
                maxWidth: width - 40,
              },
              arrow: {
                direction: 'up',
                position: (editCoords.left + editCoords.width / 2) - 20 - 15,
              },
              title: t('tutorial.profile.step2.title'),
              content: t('tutorial.profile.step2.content'),
            });
          }
        }

        // Step 3: Goals & Preferences (scrolls into view)
        if (tutorialRefs.goalsButton?.current) {
          const goalsCoords = await measureComponent(tutorialRefs.goalsButton.current);
          console.log('📏 goalsButton coords:', goalsCoords);
          
          if (goalsCoords) {
            
            const targetAfterScroll = {
              top: 200,
              left: goalsCoords.left,
              width: goalsCoords.width,
              height: goalsCoords.height,
              borderRadius: 16,
            };
            
            steps.push({
              targetArea: targetAfterScroll,
              bubblePosition: {
                top: targetAfterScroll.top + targetAfterScroll.height + 20,  // BELOW the button
                left: 20,
                maxWidth: width - 40,
              },
              arrow: {
                direction: 'up',  // Arrow points UP at button
                position: (goalsCoords.left + goalsCoords.width / 2) - 20 - 15,
              },
              title: t('tutorial.profile.step3.title'),
              content: t('tutorial.profile.step3.content'),
              scrollTo: goalsCoords.top - 200,
            });
          }
        }
      

        // Step 4: Dietary Restrictions
        if (tutorialRefs.dietaryButton?.current) {
          const dietaryCoords = await measureComponent(tutorialRefs.dietaryButton.current);
          console.log('📏 dietaryButton coords:', dietaryCoords);
          
          if (dietaryCoords) {
            steps.push({
              targetArea: {
                top: 280,
                left: dietaryCoords.left,
                width: dietaryCoords.width,
                height: dietaryCoords.height,
                borderRadius: 16,
              },
              bubblePosition: {
                top: 40,  // ← Fixed position at top of screen
                left: 20,
                maxWidth: width - 40,
              },
              arrow: {
                direction: 'down',
                position: (dietaryCoords.left + dietaryCoords.width / 2) - 20 - 15,
              },
              title: t('tutorial.profile.step4.title'),
              content: t('tutorial.profile.step4.content'),
            });
          }
        }

        // Step 5: Display Settings
        if (tutorialRefs.displaySettingsButton?.current) {
          const displayCoords = await measureComponent(tutorialRefs.displaySettingsButton.current);
          console.log('📏 displaySettingsButton coords:', displayCoords);
          
          if (displayCoords) {
            steps.push({
              targetArea: {
                top: 358,  // ← Display Settings is below Dietary (280 + 78px height) 
                left: displayCoords.left,
                width: displayCoords.width,
                height: displayCoords.height,
                borderRadius: 16,
              },
              bubblePosition: {
                top: 100,  // ← Fixed position at top of screen
                left: 20,
                maxWidth: width - 40,
              },
              arrow: {
                direction: 'down',
                position: (displayCoords.left + displayCoords.width / 2) - 20 - 15,
              },
              title: t('tutorial.profile.step5.title'),
              content: t('tutorial.profile.step5.content'),
            });
          }
        }
      }

      setStepConfig(steps);
      console.log('✅ Steps created:', steps.length);
      console.log('📋 Step order:', steps.map((s, i) => `${i+1}. ${s.title}`));
      setVisible(steps.length > 0);
      setMeasuring(false);
    } catch (error) {
      console.error('Error measuring components:', error);
      setMeasuring(false);
    }
  };

  const measureComponent = (ref, retries = 3) => {
    return new Promise((resolve) => {     
      if (!ref || !ref.measureInWindow) {
        resolve(null);
        return;
      }

      const attemptMeasure = (attemptsLeft) => {
        ref.measureInWindow((x, y, w, h) => {
          console.log(`📏 Measuring (${attemptsLeft} attempts left):`, { x, y, w, h });
          
          if (w > 0 && h > 0) {
            resolve({
              top: y + insets.top,
              left: x,
              width: w,
              height: h,
              borderRadius: 16,
            });
          } else if (attemptsLeft > 0) {
            // Layout not ready, try again
            console.log('⏳ Layout not ready, retrying in 300ms...');
            setTimeout(() => attemptMeasure(attemptsLeft - 1), 300);
          } else {
            console.log('❌ Failed to measure after retries');
            resolve(null);
          }
        });
      };

      attemptMeasure(retries);
    });
  };

  if (!visible || !stepConfig || stepConfig.length === 0 || currentStep >= stepConfig.length) {
    return null;
  }

  const step = stepConfig[currentStep];

  // Check if step requires specific mode
  if (step.requireMode && mode !== step.requireMode) {
    return null; // Don't show step if mode doesn't match
  }

  const handleNext = async () => {
    const currentStepData = stepConfig[currentStep];
    
    // HANDLE MODE SWITCHING FOR SCANNER (Step 2 → Step 3)
    if (currentStepData.switchModeOnNext) {
      console.log('🔄 Switching to photo mode...');
      if (setMode) setMode('photo');
      
      // Wait for mode to switch and capture button to render
      setTimeout(() => {
        if (currentStep < stepConfig.length - 1) {
          nextStep();
        } else {
          skipTutorial();
          setVisible(false);
        }
      }, 500);
      return;
    }
    
    // EXISTING LOGIC FOR HOME SCREEN
    if (currentStep < stepConfig.length - 1) {
      const nextStepIndex = currentStep + 1;
      const nextStepData = stepConfig[nextStepIndex];
      
      // If next step needs scrolling, scroll FIRST then re-measure
      if (nextStepData?.scrollTo && scrollViewRef?.current) {
        scrollViewRef.current?.scrollTo({ 
          y: nextStepData.scrollTo, 
          animated: true 
        });
        
        // Wait for scroll to complete, then re-measure the target
        setTimeout(async () => {
          if (nextStepIndex === 2 && tutorialRefs.mealsList?.current) {
            // Re-measure meals list after scroll
            const newCoords = await measureComponent(tutorialRefs.mealsList.current);
            console.log('📏 RE-MEASURED mealsList after scroll:', newCoords);
            
            if (newCoords) {
              // Update the step config with new coordinates
              const updatedSteps = [...stepConfig];
              updatedSteps[nextStepIndex] = {
                ...updatedSteps[nextStepIndex],
                targetArea: newCoords,
              };
              setStepConfig(updatedSteps);
            }
          }
          
          // Then advance to next step
          nextStep();
        }, 600); // Wait for scroll animation
      } else {
        // No scrolling needed, just advance
        nextStep();
      }
    } else {
      // Last step - complete tutorial
      skipTutorial();
      setVisible(false);

      // Only show thank you after Profile tutorial (the final one)
      if (screen === 'Profile') {
        setTimeout(() => {
          alert(t('tutorial.thankYou'));
        }, 300);
      }

      // Refresh profile to get latest tutorial flags
      if (onProfileRefresh) {
        await onProfileRefresh();
      }
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleSkip = () => {
    skipTutorial();
    setVisible(false);

    // Call onComplete if user skips
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay} pointerEvents="box-only">
        {/* Gray overlay - everything except target */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Top gray area */}
          {step.targetArea && (
            <View 
              style={[styles.grayArea, { height: step.targetArea.top }]} 
              pointerEvents="box-only"
            />
          )}
          
          {/* Left gray area */}
          {step.targetArea && (
            <View 
              style={[
                styles.grayArea, 
                { 
                  top: step.targetArea.top,
                  height: step.targetArea.height,
                  width: step.targetArea.left 
                }
              ]} 
              pointerEvents="box-only"
            />
          )}
          
          {/* Right gray area */}
          {step.targetArea && (
            <View 
              style={[
                styles.grayArea, 
                { 
                  top: step.targetArea.top,
                  left: step.targetArea.left + step.targetArea.width,
                  height: step.targetArea.height,
                  width: width - (step.targetArea.left + step.targetArea.width)
                }
              ]} 
              pointerEvents="box-only"
            />
          )}
          
          {/* Bottom gray area */}
          {step.targetArea && (
            <View 
              style={[
                styles.grayArea, 
                { 
                  top: step.targetArea.top + step.targetArea.height,
                  height: height - (step.targetArea.top + step.targetArea.height)
                }
              ]} 
              pointerEvents="box-only"
            />
          )}

          {/* Highlight border around target */}
          {step.targetArea && (
            <View style={[
              styles.highlightBorder,
              {
                top: step.targetArea.top - 3,
                left: step.targetArea.left - 3,
                width: step.targetArea.width + 6,
                height: step.targetArea.height + 6,
                borderRadius: step.targetArea.borderRadius || 16,
              }
            ]} />
          )}

          {/* Extra highlights for Step 2 */}
          {step.extraHighlights?.map((highlight, index) => (
            <View key={index} style={[
              styles.highlightBorder,
              {
                top: highlight.top - 3,
                left: highlight.left - 3,
                width: highlight.width + 6,
                height: highlight.height + 6,
                borderRadius: highlight.borderRadius || 16,
              }
            ]} />
          ))}
        </View>

        {/* Speech Bubble */}
        <View style={[
          styles.bubble,
          { 
            top: step.bubblePosition.top,
            left: step.bubblePosition.left,
            backgroundColor: theme.cardBackground,
          },
          step.bubblePosition.maxWidth && { maxWidth: step.bubblePosition.maxWidth }
        ]}>
          {/* Arrow */}
          {step.arrow && (
            <View style={[
              step.arrow.direction === 'up' ? styles.arrowUp : styles.arrowDown,
              {
                left: step.arrow.position,
                backgroundColor: theme.cardBackground,
              }
            ]} />
          )}

          <Text style={[styles.bubbleTitle, { color: theme.text }]}>
            {step.title}
          </Text>
          <Text style={[styles.bubbleContent, { color: theme.textSecondary }]}>
            {step.content}
          </Text>

          {/* Image animation */}
          {step.images && step.images[animFrame] && (
            <Image
              source={step.images[animFrame]}
              style={styles.gifImage}
              resizeMode="contain"
            />
          )}

          <View style={styles.bubbleButtons}>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={[styles.skipButton, { color: theme.textTertiary }]}>
                {t('tutorial.skip')}
              </Text>
            </TouchableOpacity>

            <View style={[styles.stepIndicator, { backgroundColor: theme.background }]}>
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>
                {currentStep + 1}/{stepConfig.length}
              </Text>
            </View>

            <TouchableOpacity onPress={handleNext} style={[styles.nextButton, { backgroundColor: theme.primary }]}>
              <Text style={styles.nextButtonText}>
                {currentStep === stepConfig.length - 1 ? t('tutorial.finish') : t('tutorial.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  grayArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderWidth: 3,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  highlightBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  bubble: {
    position: 'absolute',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
    maxWidth: width - 40,
  },
  arrow: {
    position: 'absolute',
    width: 30,
    height: 30,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -15,
    width: 30,
    height: 30,
    transform: [{ rotate: '45deg' }],
  },
  bubbleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 18,
  },
  bubbleContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  bubbleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    fontSize: 14,
    padding: 8,
  },
  stepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '500',
  },
  nextButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  gifImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
  },
  arrowUp: {
    position: 'absolute',
    top: -15,  // Appears above bubble
    width: 30,
    height: 30,
    transform: [{ rotate: '45deg' }],
  },
});