import React from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const handleShare = async () => {

  const { uri } = await Print.printToFileAsync({
    html: reportHTML
  });

  await Sharing.shareAsync(uri);
};

const handleDownload = async () => {

  try {

    // ask permission
    const permission = await MediaLibrary.requestPermissionsAsync();

    if (!permission.granted) {
      alert("Permission required to save file.");
      return;
    }

    // create pdf file
    const { uri } = await Print.printToFileAsync({
      html: reportHTML
    });

    // save into media library
    await MediaLibrary.createAssetAsync(uri);

    alert("Report saved to device.");

  } catch (err) {
    console.log(err);
    alert("Download failed.");
  }
};

export default function ReportViewerScreen({ route, navigation }) {

  const { theme } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const reportHTML = route?.params?.reportHTML || '';
  const periodLabel = route?.params?.periodLabel || '';

  const handleShare = async () => {

    const { uri } = await Print.printToFileAsync({
      html: reportHTML
    });

    await Sharing.shareAsync(uri);
  };

  const handleDownload = async () => {

    const { uri } = await Print.printToFileAsync({
      html: reportHTML
    });

    await Sharing.shareAsync(uri);
  };

  return (
    <SafeAreaView style={{ flex:1 }}>

      {/* REPORT PREVIEW */}
      <View style={{ flex:1 }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: reportHTML }}
          style={{ flex:1 }}
        />
      </View>

      {/* ACTION BUTTONS */}
      <View style={{
        position:'absolute',
        bottom: insets.bottom + 20,
        left:0,
        right:0,
        alignItems:'center'
      }}>

        <TouchableOpacity
          onPress={handleShare}
          style={{
            flexDirection:'row',
            alignItems:'center',
            justifyContent:'center',
            backgroundColor: theme.primary,
            paddingVertical:16,
            paddingHorizontal:28,
            borderRadius:999,
            shadowColor:'#000',
            shadowOpacity:0.15,
            shadowRadius:10,
            shadowOffset:{ width:0, height:6 },
            elevation:6
          }}
        >

          <MaterialIcons name="share" size={22} color="#fff" />

          <Text style={{
            color:'#fff',
            fontWeight:'700',
            fontSize:16,
            marginLeft:10
          }}>
            {t('stats.exportReport.share')}
          </Text>

        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1 },
  section: { padding:20 },
  title: { fontSize:24, fontWeight:'bold' }
});
