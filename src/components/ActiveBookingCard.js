import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { closingLabel } from '../constants/hours';

const fmt = (d) =>
  new Date(d).toLocaleString([], { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function ActiveBookingCard({ booking }) {
  const started = new Date(booking.createdAt).getTime() <= Date.now();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Booking</Text>
      <Text style={styles.text}>You can make a new booking after you leave and pay.</Text>

      <View style={styles.box}>
        <Text style={styles.label}>Your Booking QR Code</Text>
        <View style={styles.qrWrap}>
          <QRCode value={`PARKPRO:${booking.bookingId}`} size={180} />
        </View>
        <Text style={styles.id}>{booking.bookingId}</Text>
        <Text style={styles.label}>{booking.space?.label}</Text>
        <Text style={styles.label}>Starts: {fmt(booking.createdAt)}</Text>
        <Text style={styles.label}>Expected departure: {fmt(booking.expectedDeparture)}</Text>
        <Text style={styles.status}>{started ? 'In progress' : 'Upcoming'}</Text>
      </View>

      <Text style={styles.note}>
        Parking ends only when the admin scans your Booking QR code. You pay for the actual time parked,
        Rs{booking.space?.pricePerHour} per hour, and any started hour counts as a full hour.
      </Text>
      <Text style={styles.note}>Please leave before closing time ({closingLabel}).</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000', padding: 20, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#16a34a', textAlign: 'center', marginBottom: 10 },
  text: { fontSize: 15, color: '#BDBDBD', textAlign: 'center', marginBottom: 24 },
  box: { backgroundColor: '#171717', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 13, color: '#BDBDBD', marginBottom: 6 },
  id: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  status: { color: '#FFD000', fontSize: 14, fontWeight: '700', marginTop: 4 },
  qrWrap: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 14 },
  note: { color: '#BDBDBD', fontSize: 12, marginBottom: 6, textAlign: 'center' },
});