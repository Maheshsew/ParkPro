import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { subscribeToSpaces, isOccupiedNow } from '../storage/bookingStore';
import { TOTAL_SPACES, ALL_SPACES } from '../constants/spaces';
import { hoursLabel, openingLabel, isOpenNow } from '../constants/hours';
import Ionicons from '@expo/vector-icons/Ionicons';

const STEPS = [
  { number: '1', text: 'Sign up or log in with your vehicle registration number.' },
  { number: '2', text: 'Choose a day, start time and duration, then pick a green parking space.' },
  { number: '3', text: 'Get your booking QR code. The admin scans it when you leave.' },
];

export default function HomeScreen({ navigation }) {
  const [spaces, setSpaces] = useState({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeToSpaces(setSpaces);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const open = isOpenNow(now);
  const validIds = new Set(ALL_SPACES.map((sp) => sp.id));
  const occupiedCount = Object.entries(spaces).filter(
    ([id, sp]) => validIds.has(id) && isOccupiedNow(sp.reservations, now)
  ).length;
  const availableCount = TOTAL_SPACES - occupiedCount;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.welcomeTitle}>Welcome to ParkPro</Text>
      <Text style={styles.subtitle}>Find your parking space quickly and easily.</Text>

      <View style={styles.hoursCard}>
        <Ionicons name="time-outline" size={20} color="#FFD000" />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.hoursTitle}>Opening hours</Text>
          <Text style={styles.hoursText}>Open daily {hoursLabel}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: open ? '#16a34a' : '#ef4444' }]}>
          <Text style={styles.badgeText}>{open ? 'OPEN' : 'CLOSED'}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}><Ionicons name="car" size={20} color="#FFD000" />  PARKING STATUS (NOW)</Text>

        {open ? (
          <>
            <View style={styles.statusRow}>
              <Text style={styles.statusDot}><Ionicons name="ellipse" size={14} color="#22C55E" style={styles.statusDot} /></Text>
              <Text style={styles.statusText}>{availableCount} Available</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusDot}><Ionicons name="ellipse" size={14} color="#EF4444" style={styles.statusDot} /></Text>
              <Text style={styles.statusText}>{occupiedCount} Occupied</Text>
            </View>
          </>
        ) : (
          <Text style={styles.statusText}>Closed now. You can still book from {openingLabel} on a coming day.</Text>
        )}

        <TouchableOpacity
          style={styles.viewParkingButton}
          onPress={() => navigation.navigate('Parking')}
        >
          <Text style={styles.viewParkingButtonText}>View Parking</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.howItWorksTitle}>How ParkPro Works</Text>

      {STEPS.map((step) => (
        <View key={step.number} style={styles.stepRow}>
          <View style={styles.stepNumberCircle}>
            <Text style={styles.stepNumberText}>{step.number}</Text>
          </View>
          <Text style={styles.stepText}>{step.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000', padding: 24, paddingTop: 5 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#BDBDBD', marginBottom: 20 },

  hoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 16,
  },
  hoursTitle: { fontSize: 13, color: '#BDBDBD' },
  hoursText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  badge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  statusCard: {
    backgroundColor: '#171717',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    marginBottom: 32,
  },
  statusTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 16, letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusDot: { fontSize: 16, marginRight: 8 },
  statusText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  viewParkingButton: {
    backgroundColor: '#FFD000',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 12,
  },
  viewParkingButtonText: { color: '#000000', fontSize: 16, fontWeight: '600', textAlign: 'center' },

  howItWorksTitle: { fontSize: 19, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: { color: '#000000', fontWeight: 'bold', fontSize: 14 },
  stepText: { flex: 1, fontSize: 14, color: '#FFFFFF', lineHeight: 20, paddingTop: 4 },
});