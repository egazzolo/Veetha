import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Image, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLanguage } from '../utils/LanguageContext';

// 1cm ~= 63dp at the app's established 160dp/inch baseline (same conversion
// used for tutorial coach-mark positioning elsewhere in the app).
const CM_TO_DP = 63;
const FRAME_VERTICAL_MARGIN = 3 * CM_TO_DP;
const FRAME_SIDE_MARGIN = 16;
const HANDLE_SIZE = 28;
const MIN_FRAME_SIZE = 80;

// A full-screen crop step that replaces the OS's native "allowsEditing" photo
// editor. The native editor's frame is rendered by iOS/Android themselves --
// outside RN's control -- and runs edge-to-edge, so it sits behind the status
// bar and home indicator on many devices. This draws the frame ourselves,
// starting 3cm in from the top/bottom of the screen (via safe-area insets) on
// every device so it's never hidden behind OS chrome -- and, unlike the first
// version, the frame is fully draggable and resizable from any corner.
export default function PhotoCropOverlay({ visible, imageUri, onCancel, onConfirm }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const [imgNatural, setImgNatural] = useState(null);
  const [processing, setProcessing] = useState(false);

  const defaultFrame = () => {
    const top = insets.top + FRAME_VERTICAL_MARGIN;
    const bottom = screenH - insets.bottom - FRAME_VERTICAL_MARGIN;
    return {
      x: FRAME_SIDE_MARGIN,
      y: top,
      width: screenW - FRAME_SIDE_MARGIN * 2,
      height: Math.max(bottom - top, MIN_FRAME_SIZE),
    };
  };

  const [frame, setFrame] = useState(defaultFrame);
  // Snapshot of the frame at gesture start -- deltas from the gesture are
  // applied on top of this, not the live (already-updated) frame state,
  // so a drag reads consistently even across multiple onUpdate calls.
  const frameStartRef = useRef(frame);

  useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(
        imageUri,
        (w, h) => setImgNatural({ w, h }),
        () => setImgNatural(null)
      );
      setFrame(defaultFrame());
    } else {
      setImgNatural(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imageUri]);

  if (!visible || !imageUri) return null;

  const clampFrame = ({ x, y, width, height }) => {
    width = Math.max(MIN_FRAME_SIZE, width);
    height = Math.max(MIN_FRAME_SIZE, height);
    x = Math.max(0, x);
    y = Math.max(0, y);
    if (x + width > screenW) width = screenW - x;
    if (y + height > screenH) height = screenH - y;
    return { x, y, width, height };
  };

  const moveGesture = Gesture.Pan()
    .onBegin(() => {
      frameStartRef.current = frame;
    })
    .onUpdate((e) => {
      const start = frameStartRef.current;
      setFrame(
        clampFrame({
          x: start.x + e.translationX,
          y: start.y + e.translationY,
          width: start.width,
          height: start.height,
        })
      );
    });

  const makeHandleGesture = (corner) =>
    Gesture.Pan()
      .onBegin(() => {
        frameStartRef.current = frame;
      })
      .onUpdate((e) => {
        const start = frameStartRef.current;
        let { x, y, width, height } = start;
        if (corner === 'tl') {
          x = start.x + e.translationX;
          y = start.y + e.translationY;
          width = start.width - e.translationX;
          height = start.height - e.translationY;
        } else if (corner === 'tr') {
          y = start.y + e.translationY;
          width = start.width + e.translationX;
          height = start.height - e.translationY;
        } else if (corner === 'bl') {
          x = start.x + e.translationX;
          width = start.width - e.translationX;
          height = start.height + e.translationY;
        } else if (corner === 'br') {
          width = start.width + e.translationX;
          height = start.height + e.translationY;
        }
        // Anchor the opposite edge when shrinking past the minimum, so the
        // frame doesn't visually flip/jump once a corner crosses its neighbor.
        if (width < MIN_FRAME_SIZE) {
          if (corner === 'tl' || corner === 'bl') x = start.x + start.width - MIN_FRAME_SIZE;
          width = MIN_FRAME_SIZE;
        }
        if (height < MIN_FRAME_SIZE) {
          if (corner === 'tl' || corner === 'tr') y = start.y + start.height - MIN_FRAME_SIZE;
          height = MIN_FRAME_SIZE;
        }
        setFrame(clampFrame({ x, y, width, height }));
      });

  const handleGestures = {
    tl: makeHandleGesture('tl'),
    tr: makeHandleGesture('tr'),
    bl: makeHandleGesture('bl'),
    br: makeHandleGesture('br'),
  };

  // "Contain" layout of the photo within the full screen, centered -- the
  // black-letterbox look the user wanted, same as other apps' custom croppers.
  let displayW = screenW;
  let displayH = screenH;
  let offsetX = 0;
  let offsetY = 0;
  if (imgNatural) {
    const imgAspect = imgNatural.w / imgNatural.h;
    const screenAspect = screenW / screenH;
    if (imgAspect > screenAspect) {
      displayW = screenW;
      displayH = screenW / imgAspect;
      offsetY = (screenH - displayH) / 2;
    } else {
      displayH = screenH;
      displayW = screenH * imgAspect;
      offsetX = (screenW - displayW) / 2;
    }
  }

  const handleConfirm = async () => {
    if (!imgNatural) {
      onConfirm(imageUri);
      return;
    }
    setProcessing(true);
    try {
      const scale = imgNatural.w / displayW;

      // Clamp the frame to the actually-displayed image bounds -- the user
      // can drag/resize it past the letterboxed image on some photos.
      const cropLeftDisp = Math.max(frame.x, offsetX);
      const cropTopDisp = Math.max(frame.y, offsetY);
      const cropRightDisp = Math.min(frame.x + frame.width, offsetX + displayW);
      const cropBottomDisp = Math.min(frame.y + frame.height, offsetY + displayH);

      const originX = Math.round((cropLeftDisp - offsetX) * scale);
      const originY = Math.round((cropTopDisp - offsetY) * scale);
      const cropW = Math.round((cropRightDisp - cropLeftDisp) * scale);
      const cropH = Math.round((cropBottomDisp - cropTopDisp) * scale);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      onConfirm(result.uri);
    } catch (err) {
      console.error('Photo crop error:', err);
      onConfirm(imageUri); // fall back to the uncropped photo rather than losing it
    } finally {
      setProcessing(false);
    }
  };

  const handleStyle = (top, left) => [styles.handle, { top: top - HANDLE_SIZE / 2, left: left - HANDLE_SIZE / 2 }];

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onCancel}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Image
            source={{ uri: imageUri }}
            style={{ position: 'absolute', left: offsetX, top: offsetY, width: displayW, height: displayH }}
            resizeMode="contain"
          />

          {/* Dim everything outside the frame */}
          <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: frame.y }]} />
          <View
            pointerEvents="none"
            style={[styles.dim, { top: frame.y + frame.height, left: 0, right: 0, bottom: 0 }]}
          />
          <View pointerEvents="none" style={[styles.dim, { top: frame.y, left: 0, width: frame.x, height: frame.height }]} />
          <View
            pointerEvents="none"
            style={[styles.dim, { top: frame.y, left: frame.x + frame.width, right: 0, height: frame.height }]}
          />

          {/* Movable frame body -- drag anywhere inside to reposition */}
          <GestureDetector gesture={moveGesture}>
            <View
              style={[styles.frameBorder, { top: frame.y, left: frame.x, width: frame.width, height: frame.height }]}
            />
          </GestureDetector>

          {/* Corner handles -- drag to resize */}
          <GestureDetector gesture={handleGestures.tl}>
            <View style={handleStyle(frame.y, frame.x)} />
          </GestureDetector>
          <GestureDetector gesture={handleGestures.tr}>
            <View style={handleStyle(frame.y, frame.x + frame.width)} />
          </GestureDetector>
          <GestureDetector gesture={handleGestures.bl}>
            <View style={handleStyle(frame.y + frame.height, frame.x)} />
          </GestureDetector>
          <GestureDetector gesture={handleGestures.br}>
            <View style={handleStyle(frame.y + frame.height, frame.x + frame.width)} />
          </GestureDetector>

          <View style={[styles.buttonRow, { bottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={processing}
            >
              <Text style={styles.buttonText}>{t('submitProduct.cropRetake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              disabled={processing}
            >
              <Text style={styles.buttonText}>
                {processing ? t('submitProduct.cropping') : t('submitProduct.cropUsePhoto')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.65)' },
  frameBorder: { position: 'absolute', borderWidth: 2, borderColor: '#fff', borderRadius: 4 },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  buttonRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  button: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.2)' },
  confirmButton: { backgroundColor: '#4CAF50' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
