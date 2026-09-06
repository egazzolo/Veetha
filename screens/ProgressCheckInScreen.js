import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useTheme } from '../utils/ThemeContext';
import { useUser } from '../utils/UserContext';
import { useLanguage } from '../utils/LanguageContext';
import { supabase } from '../utils/supabase';
import { scale } from '../utils/responsive';

const LBS_PER_KG = 2.20462;

export default function ProgressCheckInScreen({ navigation }) {
  const { theme } = useTheme();
  const { user, profile } = useUser();
  const { t } = useLanguage();
  const unit = profile?.unit_preference || 'imperial';

  const [weight, setWeight] = useState('');
  const [facing, setFacing] = useState('back');
  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef(null);

  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8, base64: false });
      if (photo?.uri) setPhotoUri(photo.uri);
    } catch (error) {
      console.error('Progress photo capture error:', error);
      Alert.alert(t('common.error'), t('progress.captureFailed'));
    }
  };

  const handleSave = async () => {
    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      Alert.alert(t('progress.missingWeightTitle'), t('progress.missingWeightBody'));
      return;
    }

    setSaving(true);
    try {
      const weightKg = unit === 'imperial' ? weightNum / LBS_PER_KG : weightNum;
      let photoPath = null;

      if (photoUri) {
        const base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('progress-photos')
          .upload(fileName, decode(base64), { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        photoPath = fileName;
      }

      const { error: insertError } = await supabase.from('weight_logs').insert({
        user_id: user.id,
        weight_kg: weightKg,
        photo_path: photoPath,
        logged_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;

      navigation.goBack();
    } catch (error) {
      console.error('Progress check-in save error:', error);
      Alert.alert(t('common.error'), error.message || t('progress.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backBtn, { color: theme.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('progress.checkInTitle')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PhotoTips')}>
            <Text style={[styles.tipsLink, { color: theme.primary }]}>{t('progress.tipsLink')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cameraWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
              <View style={styles.silhouette} pointerEvents="none" />
              <Text style={styles.cameraHint}>{t('progress.lineUpHint')}</Text>
              <TouchableOpacity
                style={styles.flipBtn}
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              >
                <Text style={styles.flipBtnText}>🔄</Text>
              </TouchableOpacity>
            </CameraView>
          )}
        </View>

        {photoUri ? (
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhotoUri(null)}>
            <Text style={[styles.retakeBtnText, { color: theme.primary }]}>{t('progress.retake')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.shutterRow}>
            <TouchableOpacity style={styles.shutterBtn} onPress={handleCapture} />
          </View>
        )}

        <View style={styles.weightSection}>
          <Text style={[styles.weightLabel, { color: theme.textSecondary }]}>{t('progress.currentWeight')}</Text>
          <View style={styles.weightInputRow}>
            <TextInput
              style={[styles.weightInput, { color: theme.text, borderColor: theme.border }]}
              placeholder={unit === 'imperial' ? '165' : '75'}
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <Text style={[styles.weightUnit, { color: theme.textSecondary }]}>{unit === 'imperial' ? 'lbs' : 'kg'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('progress.saveCheckIn')}</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { fontSize: scale(22), fontWeight: '600' },
  headerTitle: { fontSize: scale(16), fontWeight: '700' },
  tipsLink: { fontSize: scale(12.5), fontWeight: '700' },
  cameraWrap: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', height: scale(360) },
  camera: { flex: 1 },
  preview: { flex: 1 },
  silhouette: {
    position: 'absolute', top: '50%', left: '50%',
    width: scale(120), height: scale(280),
    marginLeft: -scale(60), marginTop: -scale(140),
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed',
    borderRadius: 60,
  },
  cameraHint: {
    position: 'absolute', bottom: 12, left: 14, right: 14, textAlign: 'center',
    color: '#fff', fontSize: scale(11.5), backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8, borderRadius: 10,
  },
  flipBtn: {
    position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  flipBtnText: { fontSize: scale(16) },
  shutterRow: { alignItems: 'center', marginVertical: 14 },
  shutterBtn: {
    width: scale(58), height: scale(58), borderRadius: scale(29),
    backgroundColor: '#fff', borderWidth: 4, borderColor: '#4CAF50',
  },
  retakeBtn: { alignItems: 'center', marginVertical: 14 },
  retakeBtnText: { fontSize: scale(14), fontWeight: '700' },
  weightSection: { paddingHorizontal: 20, marginBottom: 14 },
  weightLabel: { fontSize: scale(12.5), fontWeight: '700', marginBottom: 8 },
  weightInputRow: { position: 'relative' },
  weightInput: {
    borderWidth: 2, borderRadius: 10, padding: scale(14), fontSize: scale(15), paddingRight: 50,
  },
  weightUnit: { position: 'absolute', right: 15, top: scale(14), fontSize: scale(15) },
  saveBtn: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: scale(16), fontWeight: '700' },
});
