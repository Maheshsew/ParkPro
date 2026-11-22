import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Alert } from '../components/Popup';
import { createBooking } from '../storage/bookingStore';
import { sendBookingEmail } from '../utils/sendBookingEmail';
import { useAuth } from '../context/AuthContext';
import { hoursLabel, closingLabel, validateWindow } from '../constants/hours';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';

const fmt = (d) =>
  new Date(d).toLocaleString([], { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function CustomerInfoScreen({ route, navigation }) {
  const { space, startTime, hours } = route.params;
  const { user, profile } = useAuth();

  const [vehicleReg, setVehicleReg] = useState(profile?.vehicleReg || '');
  const [booked, setBooked] = useState(null); // { bookingId }
  const [emailSent, setEmailSent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const start = new Date(startTime);
  const expected = new Date(start.getTime() + hours * 3600 * 1000);
  const estimatedPrice = hours * space.pricePerHour;

  const handleSubmit = async () => {
    if (submitting) return;

    const cleanReg = vehicleReg.trim().toUpperCase();
    if (!/^[A-Z0-9\s-]{3,12}$/.test(cleanReg)) {
      Alert.alert('Invalid vehicle number', 'Enter a valid registration number (3 to 12 letters/digits).');
      return;
    }

    if (start.getTime() < Date.now() - 10 * 60 * 1000) {
      Alert.alert('Start time passed', 'Go back and choose a later start time.');
      return;
    }

    if (validateWindow(start.getTime(), expected.getTime())) {
      Alert.alert('Outside opening hours', `Parking is open ${hoursLabel}. Go back and adjust your time.`);
      return;
    }

    setSubmitting(true);
    try {
      const id = await createBooking({
        uid: user.uid,
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        vehicleReg: cleanReg,
        space,
        startTime: start.toISOString(),
        expectedDeparture: expected.toISOString(),
      });

      try {
        await sendBookingEmail({
          name: profile.fullName,
          email: profile.email,
          bookingId: id,
          space,
          vehicleReg: cleanReg,
        });
        setEmailSent(true);
      } catch (e) {
        console.log('EMAIL ERROR:', e.message);
        Alert.alert('Email failed', e.message);
        setEmailSent(false);
      }

      setBooked({ bookingId: id });
    } catch (e) {
      if (e.message === 'SPACE_TAKEN') {
        Alert.alert('Space unavailable', 'Sorry, this space was just booked for that time. Please pick another one.');
        navigation.goBack();
      } else if (e.message === 'ALREADY_BOOKED') {
        Alert.alert('Booking exists', 'You already have an active booking. You can book again after you leave.');
        navigation.popToTop();
      } else if (e.message === 'OUTSIDE_HOURS') {
        Alert.alert('Outside opening hours', `Parking is open ${hoursLabel}. Go back and adjust your time.`);
      } else {
        Alert.alert('Booking failed', e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Must be logged in
  if (!user || !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.successTitle}>Login required</Text>
        <Text style={styles.successText}>Log in or sign up to book a parking space.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Account')}>
          <Text style={styles.primaryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Booking confirmation
  if (booked) {
    return (
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 40 }]}>
        <Text style={styles.successTitle}>Booking Complete!</Text>
        <Text style={styles.successText}>
          {emailSent
            ? 'A confirmation has been sent to ' + profile.email
            : 'Booking saved, but the email could not be sent. Keep your QR code below.'}
        </Text>

        <View style={styles.idBox}>
          <Text style={styles.idLabel}>Your Booking QR Code</Text>
          <View style={styles.qrWrap}>
            <QRCode value={`PARKPRO:${booked.bookingId}`} size={180} />
          </View>
          <Text style={styles.idLabel}>{space.label}</Text>
          <Text style={styles.idLabel}>Starts: {fmt(start)}</Text>
          <Text style={styles.idLabel}>Expected departure: {fmt(expected)}</Text>
        </View>

        <Text style={styles.note}>
          Parking ends only when the admin scans your Booking QR code. You pay for the actual time parked,
          Rs{space.pricePerHour} per hour, and any started hour counts as a full hour.
        </Text>
        <Text style={styles.closingNote}>Please leave before closing time ({closingLabel}).</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.primaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Confirm screen
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000000' }} behavior="padding">
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Confirm Booking</Text>
        <Text style={styles.subtitle}>{space.label} — Rs{space.pricePerHour}/hr</Text>

        <TextInput style={[styles.input, styles.readOnly]} value={profile.fullName} editable={false} />
        <TextInput style={[styles.input, styles.readOnly]} value={profile.email} editable={false} />
        <TextInput style={[styles.input, styles.readOnly]} value={profile.phone} editable={false} />
        <TextInput
          style={[styles.input, profile.vehicleReg ? styles.readOnly : null]}
          value={vehicleReg}
          editable={!profile.vehicleReg}
          onChangeText={setVehicleReg}
          placeholder="Vehicle Registration Number"
          placeholderTextColor="#BDBDBD"
          selectionColor="#FFD000"
          keyboardAppearance="dark"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Starting time</Text>
        <View style={[styles.input, styles.readOnly]}>
          <Text style={styles.readOnlyText}>{fmt(start)}</Text>
        </View>

        <Text style={styles.label}>Expected departure ({hours}h)</Text>
        <View style={[styles.input, styles.readOnly]}>
          <Text style={styles.readOnlyText}>{fmt(expected)}</Text>
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>Estimated price</Text>
          <Text style={styles.priceValue}>Rs{estimatedPrice.toFixed(2)}</Text>
          <Text style={styles.priceNote}>
            Final price = actual time parked, rounded up to the next full hour (Rs{space.pricePerHour}/hr).
            Even 15 minutes counts as 1 hour. Leaving early is fine.
          </Text>
        </View>

        <Text style={styles.closingNote}>
          Parking is open {hoursLabel}. All vehicles must leave before closing time ({closingLabel}).
        </Text>
        <Text style={styles.note}>
          To change the day, time or duration, go back to the parking page.
          Parking ends only when the admin scans your Booking QR code.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Booking...' : 'Confirm Booking'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={submitting}>
          <Ionicons name="arrow-back" size={20} color="#FFD000" />
          <Text style={styles.backButtonText}>Back to parking</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000', padding: 20, justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#BDBDBD', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 6, marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF', backgroundColor: '#171717', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 15 },
  readOnly: { backgroundColor: '#0D0D0D', color: '#BDBDBD' },
  readOnlyText: { color: '#BDBDBD', fontSize: 15 },
  priceBox: { backgroundColor: '#171717', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  priceLabel: { color: '#BDBDBD', fontSize: 13 },
  priceValue: { color: '#FFD000', fontSize: 26, fontWeight: 'bold', marginVertical: 4 },
  priceNote: { color: '#BDBDBD', fontSize: 12, textAlign: 'center' },
  note: { color: '#BDBDBD', fontSize: 12, marginBottom: 6, textAlign: 'center' },
  closingNote: { color: '#BDBDBD', fontSize: 12, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  primaryButton: { backgroundColor: '#FFD000', paddingVertical: 16, borderRadius: 10, marginTop: 10 },
  primaryButtonText: { color: '#000000', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  successTitle: { fontSize: 26, fontWeight: 'bold', color: '#16a34a', textAlign: 'center', marginBottom: 10 },
  successText: { fontSize: 15, color: '#BDBDBD', textAlign: 'center', marginBottom: 30 },
  idBox: { backgroundColor: '#171717', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 20 },
  idLabel: { fontSize: 13, color: '#BDBDBD', marginBottom: 6 },
  idValue: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFD000',
    backgroundColor: '#171717',
  },
  backButtonText: { color: '#FFD000', fontSize: 17, fontWeight: '600', marginLeft: 8 },
  qrWrap: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 14 },
});