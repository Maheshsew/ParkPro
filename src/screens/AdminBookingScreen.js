import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Alert } from '../components/Popup';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBooking, completePayment, vacateSpace, calculateElapsedTime, cancelBooking } from '../storage/bookingStore';

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '-');
const QR_PREFIX = 'PARKPRO:';

export default function AdminBookingScreen() {
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [booking, setBooking] = useState(null);
  const [timeInfo, setTimeInfo] = useState(null); // { totalMinutes, decimalHours, display, billedHours }
  const [total, setTotal] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  const lookup = async (rawId) => {
    const id = rawId.trim().toUpperCase();
    if (!id) return;
    try {
      const result = await getBooking(id);
      if (!result) {
        Alert.alert('Not Found', 'No booking with that ID.');
        setBooking(null);
        return;
      }
      setBooking(result);
      setTimeInfo(null);
      setTotal(result.total);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera needed', 'Allow camera access to scan booking QR codes.');
        return;
      }
    }
    scanned.current = false;
    setScanning(true);
  };

  const handleScan = ({ data }) => {
    if (scanned.current) return;
    scanned.current = true;

    if (!data || !data.startsWith(QR_PREFIX)) {
      Alert.alert('Invalid QR code', 'This is not a ParkPro booking QR code.', [
        { text: 'OK', onPress: () => { scanned.current = false; } },
      ]);
      return;
    }

    const id = data.slice(QR_PREFIX.length);
    setScanning(false);
    setBookingIdInput(id);
    lookup(id);
  };

  // Billing: actual time from the booking start (capped at closing), rounded up to the next full hour
  const handleVehicleExiting = () => {
    const elapsed = calculateElapsedTime(booking.createdAt);
    const billedHours = Math.ceil(elapsed.decimalHours);
    const calculatedTotal = billedHours * booking.space.pricePerHour;
    setTimeInfo({ ...elapsed, billedHours });
    setTotal(calculatedTotal);
  };

  const handleCompletePayment = async () => {
    if (total == null || timeInfo == null) return;
    try {
      const updated = await completePayment(booking.bookingId, total, timeInfo.totalMinutes);
      await vacateSpace(booking.bookingId, booking.space.id);
      Alert.alert(
        'Payment Completed',
        `Booking ${updated.bookingId} paid (Rs${total.toFixed(2)}). ${updated.space.label} is now available.`
      );
      reset();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // No-show: cancel and free the space
  const handleCancel = () => {
    Alert.alert('Cancel booking', 'Use this for a no-show. The space becomes available again.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(booking.bookingId, booking.space.id);
            Alert.alert('Cancelled', `${booking.space.label} is now available.`);
            reset();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const reset = () => {
    setBookingIdInput('');
    setBooking(null);
    setTimeInfo(null);
    setTotal(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Parking Management</Text>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
        <Ionicons name="qr-code-outline" size={22} color="#000000" />
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>or enter the Booking ID</Text>

      <TextInput
        placeholderTextColor="#BDBDBD"
        selectionColor="#FFD000"
        keyboardAppearance="dark"
        style={styles.input}
        placeholder="Booking ID (e.g. PP-1234)"
        autoCapitalize="characters"
        value={bookingIdInput}
        onChangeText={setBookingIdInput}
      />
      <TouchableOpacity style={styles.findButton} onPress={() => lookup(bookingIdInput)}>
        <Text style={styles.primaryButtonText}>Find Parking</Text>
      </TouchableOpacity>

      {booking && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Text style={styles.row}>Booking: {booking.bookingId}</Text>
          <Text style={styles.row}>Name: {booking.name}</Text>
          <Text style={styles.row}>Email: {booking.email}</Text>
          <Text style={styles.row}>Phone: {booking.phone}</Text>
          <Text style={styles.row}>Vehicle: {booking.vehicleReg}</Text>
          <Text style={styles.row}>Space: {booking.space.label} (Rs{booking.space.pricePerHour}/hr)</Text>
          <Text style={styles.row}>Start: {fmtDate(booking.createdAt)}</Text>
          <Text style={styles.row}>Expected departure: {fmtDate(booking.expectedDeparture)}</Text>
          <Text style={styles.row}>Status: {booking.status}</Text>

          {booking.status === 'PENDING_PAYMENT' && (
            <>
              <TouchableOpacity style={styles.exitButton} onPress={handleVehicleExiting}>
                <Text style={styles.primaryButtonText}>Parking Checkout</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel booking (no-show)</Text>
              </TouchableOpacity>

              {timeInfo != null && total != null && (
                <View style={styles.calcBox}>
                  <Text style={styles.calcRow}>Time parked: {timeInfo.display}</Text>
                  <Text style={styles.calcRow}>Billed: {timeInfo.billedHours}h</Text>
                  <Text style={styles.total}>Total: Rs{total.toFixed(2)}</Text>

                  <TouchableOpacity style={styles.primaryButton} onPress={handleCompletePayment}>
                    <Text style={styles.primaryButtonText}>Payment Complete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={styles.linkButton} onPress={reset}>
            <Text style={styles.linkButtonText}>Look up another booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QR scanner */}
      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Point the camera at the customer's QR code</Text>
          <TouchableOpacity style={styles.closeScan} onPress={() => setScanning(false)}>
            <Ionicons name="close" size={22} color="#FFD000" />
            <Text style={styles.closeScanText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000', padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD000', paddingVertical: 16, borderRadius: 10 },
  scanButtonText: { color: '#000000', fontSize: 17, fontWeight: '600', marginLeft: 8 },
  orText: { color: '#BDBDBD', textAlign: 'center', fontSize: 13, marginVertical: 14 },
  input: { borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF', backgroundColor: '#171717', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15 },
  findButton: { backgroundColor: '#FFD000', paddingVertical: 16, borderRadius: 10, marginBottom: 20 },
  card: { backgroundColor: '#171717', borderRadius: 10, padding: 18 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  row: { fontSize: 14, color: '#FFFFFF', marginBottom: 4 },
  exitButton: { backgroundColor: '#FFD000', paddingVertical: 16, borderRadius: 10, marginTop: 18 },
  calcBox: { backgroundColor: '#000000', borderRadius: 8, padding: 14, marginTop: 14, alignItems: 'center' },
  calcRow: { fontSize: 14, color: '#BDBDBD' },
  total: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 6, marginBottom: 4, textAlign: 'center' },
  primaryButton: { backgroundColor: '#FFD000', paddingVertical: 16, borderRadius: 10, marginTop: 12, alignSelf: 'stretch' },
  primaryButtonText: { color: '#000000', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  linkButton: { marginTop: 14 },
  linkButtonText: { color: '#FFD000', textAlign: 'center' },
  cancelText: { color: '#ef4444', textAlign: 'center' },

  scannerContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 240, height: 240, borderWidth: 3, borderColor: '#FFD000', borderRadius: 16 },
  scanHint: { color: '#FFFFFF', marginTop: 20, fontSize: 14, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  closeScan: { position: 'absolute', bottom: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderWidth: 1.5, borderColor: '#FFD000', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  closeScanText: { color: '#FFD000', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});