import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useLanguage } from '../utils/LanguageContext';
import { useUpdateCheck } from '../utils/useUpdateCheck';

const APP_STORE_URL = 'https://apps.apple.com/app/veetha/id6760553556';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.yourname.veetha';

export default function UpdateAlert() {
  const { t } = useLanguage();
  const { status } = useUpdateCheck();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    if (status === 'soft') showSoft();
    if (status === 'forced') showForced();
  }, [status]);

  const openStore = () => {
    const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url);
  };

  const showSoft = () => {
    setShown(true);
    Alert.alert(
      t('update.softTitle'),
      t('update.softMessage'),
      [
        { text: t('update.later'), style: 'cancel' },
        { text: t('update.updateNow'), onPress: openStore },
      ],
      { cancelable: true }
    );
  };

  const showForced = () => {
    setShown(true);
    Alert.alert(
      t('update.forcedTitle'),
      t('update.forcedMessage'),
      [
        { text: t('update.updateNow'), onPress: () => {
          openStore();
          // Re-show after a moment so user can't dismiss without updating
          setTimeout(() => { setShown(false); }, 1000);
        }},
      ],
      { cancelable: false }
    );
  };

  return null; // no UI, just the alert
}