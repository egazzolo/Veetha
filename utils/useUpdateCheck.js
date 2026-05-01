import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Compares two semantic version strings, e.g. "1.0.5" vs "1.0.4"
// Returns: 1 if a > b, -1 if a < b, 0 if equal
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export function useUpdateCheck() {
  const [updateStatus, setUpdateStatus] = useState({ status: 'ok', latest: null });

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const currentVersion = Constants.expoConfig?.version || '0.0.0';
      const platform = Platform.OS; // 'ios' or 'android'

      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', [`latest_version_${platform}`, `min_version_${platform}`]);

      if (error || !data || data.length === 0) {
        console.log('Update check skipped (no config):', error?.message);
        return;
      }

      const config = {};
      data.forEach(row => { config[row.key] = row.value; });

      const latestVersion = config[`latest_version_${platform}`];
      const minVersion = config[`min_version_${platform}`];

      if (!latestVersion || !minVersion) {
        console.log('Update check skipped (incomplete config)');
        return;
      }

      // If current version is BELOW the minimum supported = forced update
      if (compareVersions(currentVersion, minVersion) < 0) {
        console.log(`🚨 Forced update needed: ${currentVersion} < ${minVersion}`);
        setUpdateStatus({ status: 'forced', latest: latestVersion });
        return;
      }

      // If current version is below the latest = soft update suggestion
      if (compareVersions(currentVersion, latestVersion) < 0) {
        console.log(`💡 Soft update available: ${currentVersion} < ${latestVersion}`);
        setUpdateStatus({ status: 'soft', latest: latestVersion });
        return;
      }

      // User is on latest or newer
      console.log(`✅ App version up-to-date: ${currentVersion}`);
      setUpdateStatus({ status: 'ok', latest: latestVersion });
    } catch (err) {
      console.error('Update check failed:', err);
    }
  };

  return updateStatus;
}