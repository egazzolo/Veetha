import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../utils/supabase';

export default function AdminDashboardScreen() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch influencer data from Supabase
  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('influencer_campaigns')
        .select('*')
        .order('campaign_start', { ascending: false });
      
      if (error) throw error;
      
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaigns();
  };

  const calculateROI = (revenue, cost) => {
    if (cost === 0) return 0;
    return (((revenue - cost) / cost) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Influencer Performance 📊</Text>
      
      {campaigns.length === 0 ? (
        <Text style={styles.emptyText}>No campaigns yet</Text>
      ) : (
        campaigns.map((campaign) => (
          <View key={campaign.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.influencerName}>{campaign.influencer_name}</Text>
              <Text style={styles.platform}>{campaign.platform}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>Promo Code:</Text>
              <Text style={styles.value}>{campaign.promo_code}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>Cost Paid:</Text>
              <Text style={styles.value}>${campaign.cost_paid}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>Conversions:</Text>
              <Text style={styles.value}>{campaign.total_conversions || 0}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>Revenue:</Text>
              <Text style={styles.value}>${campaign.total_revenue || 0}</Text>
            </View>
            
            <View style={styles.row}>
              <Text style={styles.label}>ROI:</Text>
              <Text style={[
                styles.value,
                { color: calculateROI(campaign.total_revenue, campaign.cost_paid) > 0 ? '#4CAF50' : '#F44336' }
              ]}>
                {calculateROI(campaign.total_revenue, campaign.cost_paid)}%
              </Text>
            </View>
            
            <Text style={styles.date}>
              Started: {new Date(campaign.campaign_start).toLocaleDateString()}
            </Text>
          </View>
        ))
      )}
      
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={onRefresh}
      >
        <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  influencerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  platform: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});