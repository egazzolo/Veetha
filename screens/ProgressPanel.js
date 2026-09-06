import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { useUser } from '../utils/UserContext';
import { supabase } from '../utils/supabase';
import { scale } from '../utils/responsive';

const LBS_PER_KG = 2.20462;

function formatDate(iso, t) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ProgressPanel({ route, navigation }) {
  const { theme, isPremium } = route?.params || {};
  const { user } = useUser();
  const { t } = useLanguage();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  const loadLogs = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('id, weight_kg, photo_path, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      const photoPaths = rows.filter((r) => r.photo_path).map((r) => r.photo_path);
      let signedByPath = {};
      if (photoPaths.length > 0) {
        const { data: signedData } = await supabase.storage
          .from('progress-photos')
          .createSignedUrls(photoPaths, 60 * 60);
        (signedData || []).forEach((s) => {
          if (s.path && s.signedUrl) signedByPath[s.path] = s.signedUrl;
        });
      }
      setLogs(rows.map((r) => ({ ...r, signedUrl: r.photo_path ? signedByPath[r.photo_path] : null })));
    } catch (e) {
      console.error('ProgressPanel load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadLogs);
    return unsubscribe;
  }, [navigation, loadLogs]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id]; // replace the older selection
    });
  };

  const handleCompare = () => {
    const [idA, idB] = selectedIds;
    const logA = logs.find((l) => l.id === idA);
    const logB = logs.find((l) => l.id === idB);
    if (!logA || !logB) return;
    // Chronological order regardless of tap order
    const [earlier, later] = new Date(logA.logged_at) <= new Date(logB.logged_at) ? [logA, logB] : [logB, logA];
    navigation.navigate('ProgressCompare', { earlier, later });
    setSelectedIds([]);
  };

  const current = logs[0];
  const oldest = logs[logs.length - 1];
  const weightUnit = 'lbs'; // display consistently; conversion handled at render
  const toDisplay = (kg) => Math.round(kg * LBS_PER_KG);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={theme?.primary || '#4CAF50'} />;
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.checkInBtn, { backgroundColor: theme?.primary || '#4CAF50' }]}
        onPress={() => navigation.navigate('ProgressCheckIn')}
      >
        <Text style={styles.checkInBtnText}>+ {t('progress.checkIn')}</Text>
      </TouchableOpacity>

      {current && (
        <View style={[styles.weightCard, { backgroundColor: theme?.cardBackground }]}>
          <Text style={[styles.weightCardTitle, { color: theme?.textSecondary }]}>{t('progress.currentWeightLabel')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.weightNow, { color: theme?.text }]}>{toDisplay(current.weight_kg)} lbs</Text>
            {oldest && oldest.id !== current.id && (
              <Text style={styles.weightDelta}>
                {toDisplay(current.weight_kg) - toDisplay(oldest.weight_kg) <= 0 ? '↓' : '↑'}
                {' '}{Math.abs(toDisplay(current.weight_kg) - toDisplay(oldest.weight_kg))} {t('progress.sinceStart')}
              </Text>
            )}
          </View>
        </View>
      )}

      {logs.length === 0 ? (
        <Text style={[styles.emptyHint, { color: theme?.textSecondary }]}>{t('progress.noCheckIns')}</Text>
      ) : (
        <>
          <Text style={[styles.photoGridTitle, { color: theme?.text }]}>{t('progress.photosTapTwo')}</Text>
          <View style={styles.photoGrid}>
            {logs.map((log) => {
              const isSelected = selectedIds.includes(log.id);
              return (
                <TouchableOpacity
                  key={log.id}
                  style={[styles.photoTile, { backgroundColor: theme?.cardBackground }, isSelected && styles.photoTileSelected]}
                  onPress={() => log.signedUrl && toggleSelect(log.id)}
                  disabled={!log.signedUrl}
                >
                  {log.signedUrl ? (
                    <Image source={{ uri: log.signedUrl }} style={styles.photoTileImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.photoTileNoPhoto}>
                      <Text style={{ fontSize: scale(11), color: theme?.textTertiary }}>{t('progress.noPhoto')}</Text>
                    </View>
                  )}
                  <Text style={styles.photoTileDate}>{formatDate(log.logged_at, t)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {selectedIds.length === 2 && (
        <TouchableOpacity
          style={[styles.compareBtn, { backgroundColor: theme?.primary || '#4CAF50' }]}
          onPress={handleCompare}
        >
          <Text style={styles.compareBtnText}>{t('progress.compareSelected')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  checkInBtn: {
    alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 18, marginBottom: 16,
  },
  checkInBtnText: { color: '#fff', fontSize: scale(13.5), fontWeight: '700' },
  weightCard: { borderRadius: 14, padding: 16, marginBottom: 18 },
  weightCardTitle: { fontSize: scale(11.5), fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  weightNow: { fontSize: scale(22), fontWeight: '800' },
  weightDelta: { fontSize: scale(12), color: '#4CAF50', fontWeight: '700', marginLeft: 8 },
  emptyHint: { textAlign: 'center', fontSize: scale(13), marginTop: 20 },
  photoGridTitle: { fontSize: scale(13), fontWeight: '700', marginBottom: 10 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoTile: {
    width: '31.5%', aspectRatio: 0.8, borderRadius: 10, overflow: 'hidden', position: 'relative',
  },
  photoTileSelected: { borderWidth: 3, borderColor: '#4CAF50' },
  photoTileImg: { width: '100%', height: '100%' },
  photoTileNoPhoto: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoTileDate: {
    position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center',
    fontSize: scale(8.5), fontWeight: '700', color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 3,
  },
  compareBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  compareBtnText: { color: '#fff', fontSize: scale(14.5), fontWeight: '700' },
});
