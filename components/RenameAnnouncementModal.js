import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

const SEEN_VERSION_KEY = 'rename_announcement_seen_version';
const ANNOUNCEMENT_ID = 'rename_meal_break';

// Remote-controlled, not date-driven -- shows whenever the row's `version`
// in Supabase is higher than the version this device has already
// acknowledged (and `active` is true). To make it reappear for everyone,
// just bump `version` (and set active=true) on the row -- no new app build
// needed. Checked once per HomeScreen focus, but only actually shown when
// there's a genuinely new version to show.
export default function RenameAnnouncementModal({ theme }) {
  const [announcement, setAnnouncement] = useState(null);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_announcements')
          .select('*')
          .eq('id', ANNOUNCEMENT_ID)
          .maybeSingle();

        if (error || !data || !data.active) return;

        const seenVersion = parseInt(await AsyncStorage.getItem(SEEN_VERSION_KEY), 10) || 0;
        if (data.version > seenVersion) {
          setAnnouncement(data);
        }
      } catch (err) {
        console.error('Error checking announcement:', err);
      }
    })();
  }, []);

  const dismiss = async () => {
    if (announcement) {
      await AsyncStorage.setItem(SEEN_VERSION_KEY, String(announcement.version));
    }
    setAnnouncement(null);
  };

  return (
    <Modal
      visible={!!announcement}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme?.cardBackground || '#fff' }]}>
          <Image
            source={require('../assets/icons/meal_break_preview_black.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme?.text || '#1a1a1a' }]}>
            {announcement?.title || 'A change is coming soon...'}
          </Text>
          {announcement?.message && announcement.message !== announcement.title && (
            <Text style={[styles.message, { color: theme?.textSecondary || '#666' }]}>
              {announcement.message}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme?.primary || '#4CAF50' }]}
            onPress={dismiss}
          >
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    width: 160,
    height: 200,
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
