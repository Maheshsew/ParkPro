import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Alert } from '../components/Popup';
import { subscribeToSpaces, getSlotStatus, getBlockingReservation, getBooking, cancelBooking } from '../storage/bookingStore';
import { useAuth } from '../context/AuthContext';
import { COL_E, COL_A, COL_B, COL_C, COL_D, COL_F } from '../constants/spaces';
import {
  closingLabel, hoursLabel, openingOf, closingOf, latestStartOf,
} from '../constants/hours';
import Ionicons from '@expo/vector-icons/Ionicons';

const DURATIONS = [1, 2, 3, 4, 6, 8];
const HOUR_MS = 3600 * 1000;

const pad = (n) => String(n).padStart(2, '0');
const dayLabel = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const timeLabel = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDateTime = (d) =>
  new Date(d).toLocaleString([], { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// Keep a start time inside opening hours (and early enough for at least 1 hour)
const fix = (d) => {
  const open = openingOf(d).getTime();
  const latest = latestStartOf(d).getTime();
  if (d.getTime() < open) return new Date(open);
  if (d.getTime() > latest) return new Date(latest);
  return d;
};

// "Now" rounded to 5 min; before opening -> today's opening; too late -> tomorrow's opening
const nowStart = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  if (d.getTime() < openingOf(d).getTime()) return openingOf(d);
  if (d.getTime() > latestStartOf(d).getTime()) {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    return openingOf(next);
  }
  return d;
};

const STATUS_COLOR = { green: '#16a34a', yellow: '#FFD000', red: '#ef4444' };

function ParkingSlot({ space, status, bookable, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.slotIconBox, { backgroundColor: STATUS_COLOR[status] }]}
      onPress={() => bookable && onPress(space)}
      disabled={!bookable}
      activeOpacity={bookable ? 0.7 : 1}
    >
      <Ionicons name="car" size={22} color="#000000" />
    </TouchableOpacity>
  );
}

function Lane({ label }) {
  return (
    <View style={[styles.lane, label && styles.laneCenter]}>
      <View style={styles.laneDashes}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>
      {/* {label ? <Text style={styles.laneLabel}>DRIVE{'\n'}LANE</Text> : null} */}
    </View>
  );
}

export default function ParkingSpacesScreen({ navigation }) {
  const { isAdmin } = useAuth();
  const [spaces, setSpaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [start, setStart] = useState(nowStart());
  const [hours, setHours] = useState(1);
  const [selected, setSelected] = useState(null); // space shown in the popup
  const [adminSpace, setAdminSpace] = useState(null);
  const [adminBooking, setAdminBooking] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSpaces((map) => {
      setSpaces(map);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const startMs = start.getTime();
  // the stay can never go past closing time
  const maxHours = Math.max(1, Math.floor((closingOf(start).getTime() - startMs) / HOUR_MS));
  const dur = Math.min(hours, maxHours);
  const endMs = startMs + dur * HOUR_MS;
  const end = new Date(endMs);
  const isPast = startMs < now - 10 * 60 * 1000;

  const pickDay = (d) => {
    const s = new Date(start);
    s.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setStart(fix(s));
  };
    const stepHour = (n) => {
    const s = new Date(start);
    const first = openingOf(s).getHours();
    const last = latestStartOf(s).getHours();
    let h = s.getHours() + n;
    if (h > last) h = first;
    if (h < first) h = last;
    s.setHours(h);
    setStart(fix(s));
  };
  const stepMinute = (n) => {
    const s = new Date(start);
    s.setMinutes((s.getMinutes() + n * 5 + 60) % 60);
    setStart(fix(s));
  };

  const confirmSpace = () => {
    const space = selected;
    setSelected(null);
    navigation.navigate('CustomerInfo', {
      space: { id: space.id, label: `Space ${space.label}`, pricePerHour: space.pricePerHour },
      startTime: start.toISOString(),
      hours: dur,
    });
  };

  // Admin: tap a booked space -> load the booking that holds it for the chosen window
  const openBooked = async (space) => {
    const r = getBlockingReservation(spaces[space.id]?.reservations, startMs, endMs);
    if (!r) return;
    setAdminSpace(space);
    setAdminBooking(null);
    setAdminLoading(true);
    try {
      setAdminBooking(await getBooking(r.bookingId));
    } catch (e) {
      Alert.alert('Error', e.message);
      setAdminSpace(null);
    } finally {
      setAdminLoading(false);
    }
  };

  const closeAdminPopup = () => {
    setAdminSpace(null);
    setAdminBooking(null);
  };

  const handleCancelBooking = () => {
    const started = new Date(adminBooking.createdAt).getTime() <= Date.now();
    Alert.alert(
      'Cancel booking',
      started
        ? 'This booking has already started. If the car is parked, use Parking Management to check out and bill instead. Cancel anyway?'
        : 'Cancel this booking? The space becomes available again.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking(adminBooking.bookingId, adminSpace.id);
              closeAdminPopup();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD000" />
      </View>
    );
  }

  const renderColumn = (list) =>
    list.map((space) => {
      const status = getSlotStatus(spaces[space.id]?.reservations, startMs, endMs);
      // customers tap green spaces, admin taps booked (red/yellow) spaces
      const bookable = isAdmin ? status !== 'green' : status === 'green' && !isPast;
      return (
        <ParkingSlot
          key={space.id}
          space={space}
          status={status}
          bookable={bookable}
          onPress={isAdmin ? openBooked : setSelected}
        />
      );
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select a Parking Space</Text>
      <Text style={styles.subtitle}>
                {isAdmin ? 'Admin view — tap a booked space to see details or cancel' : 'Choose when you want to park, then tap a green space'}
      </Text>
      <Text style={styles.hours}>Open daily {hoursLabel}</Text>

      {/* When? bar */}
      <View style={styles.whenBox}>
        <Text style={styles.whenLabel}>Day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {days.map((d) => (
            <TouchableOpacity
              key={d.toDateString()}
              style={[styles.chip, sameDay(d, start) && styles.chipActive]}
              onPress={() => pickDay(d)}
            >
              <Text style={[styles.chipText, sameDay(d, start) && styles.chipTextActive]}>{dayLabel(d)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.timeRowWrap}>
          <View>
            <Text style={styles.whenLabel}>Start time</Text>
            <View style={styles.timeRow}>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => stepHour(1)}><Text style={styles.stepBtn}>▲</Text></TouchableOpacity>
                <Text style={styles.timeText}>{pad(start.getHours())}</Text>
                <TouchableOpacity onPress={() => stepHour(-1)}><Text style={styles.stepBtn}>▼</Text></TouchableOpacity>
              </View>
              <Text style={styles.timeText}>:</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => stepMinute(1)}><Text style={styles.stepBtn}>▲</Text></TouchableOpacity>
                <Text style={styles.timeText}>{pad(start.getMinutes())}</Text>
                <TouchableOpacity onPress={() => stepMinute(-1)}><Text style={styles.stepBtn}>▼</Text></TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.nowButton} onPress={() => setStart(nowStart())}>
            <Text style={styles.nowButtonText}>Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.whenLabel}>Expected duration (must end by {closingLabel})</Text>
        <View style={styles.chips}>
          {DURATIONS.map((h) => {
            const disabled = h > maxHours;
            return (
              <TouchableOpacity
                key={h}
                style={[styles.chip, dur === h && styles.chipActive, disabled && styles.chipDisabled]}
                onPress={() => setHours(h)}
                disabled={disabled}
              >
                <Text style={[styles.chipText, dur === h && styles.chipTextActive]}>{h}h</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.summary}>
          {dayLabel(start)}, {timeLabel(start)} → {timeLabel(end)}
        </Text>
        {isPast && <Text style={styles.pastWarning}>This start time has passed. Tap "Now" or choose a later time.</Text>}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#16a34a' }]} /><Text style={styles.legendText}>Available</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#FFD000' }]} /><Text style={styles.legendText}>Free soon</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Unavailable</Text></View>
      </View>

      <View style={styles.lot}>
        <View style={styles.column}>{renderColumn(COL_A)}</View>
        <Lane />
        <View style={styles.column}>{renderColumn(COL_B)}</View>
        <View style={styles.column}>{renderColumn(COL_C)}</View>
        <Lane />
        <View style={styles.column}>{renderColumn(COL_D)}</View>
        <View style={styles.column}>{renderColumn(COL_F)}</View>
        <Lane />
        <View style={styles.column}>{renderColumn(COL_E)}</View>
      </View>

      {/* Popup for the selected space */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.popup} onPress={() => {}}>
            <View style={styles.popupIcon}>
              <Ionicons name="car" size={30} color="#000000" />
            </View>
            <Text style={styles.popupTitle}>Space {selected?.label}</Text>
            <Text style={styles.popupPrice}>Rs {selected?.pricePerHour}/hr</Text>
            <Text style={styles.popupWindow}>
              {dayLabel(start)}, {timeLabel(start)} → {timeLabel(end)}
            </Text>

            <TouchableOpacity style={styles.bookButton} onPress={confirmSpace}>
              <Text style={styles.bookButtonText}>Book this space</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelected(null)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Admin popup: booking details + cancel */}
      <Modal visible={!!adminSpace} transparent animationType="fade" onRequestClose={closeAdminPopup}>
        <Pressable style={styles.overlay} onPress={closeAdminPopup}>
          <Pressable style={styles.popup} onPress={() => {}}>
            <View style={[styles.popupIcon, { backgroundColor: '#ef4444' }]}>
              <Ionicons name="car" size={30} color="#000000" />
            </View>
            <Text style={styles.popupTitle}>Space {adminSpace?.label}</Text>

            {adminLoading && <ActivityIndicator color="#FFD000" style={{ marginVertical: 24 }} />}

            {!adminLoading && !adminBooking && (
              <Text style={styles.popupWindow}>Booking details not found.</Text>
            )}

            {!adminLoading && adminBooking && (
              <>
                <View style={styles.detailBox}>
                  <Text style={styles.detailRow}>Booking: {adminBooking.bookingId}</Text>
                  <Text style={styles.detailRow}>Name: {adminBooking.name}</Text>
                  <Text style={styles.detailRow}>Phone: {adminBooking.phone}</Text>
                  <Text style={styles.detailRow}>Vehicle: {adminBooking.vehicleReg}</Text>
                  <Text style={styles.detailRow}>Start: {fmtDateTime(adminBooking.createdAt)}</Text>
                  <Text style={styles.detailRow}>Expected departure: {fmtDateTime(adminBooking.expectedDeparture)}</Text>
                  <Text style={styles.detailRow}>
                    State: {new Date(adminBooking.createdAt).getTime() <= Date.now() ? 'In progress' : 'Upcoming'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.cancelBookingButton} onPress={handleCancelBooking}>
                  <Text style={styles.cancelBookingText}>Cancel booking</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={closeAdminPopup}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000', paddingTop: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#BDBDBD', textAlign: 'center', marginTop: 4 },
  hours: { fontSize: 13, color: '#FFD000', fontWeight: '600', textAlign: 'center', marginTop: 4, marginBottom: 14 },

  whenBox: { backgroundColor: '#171717', borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', marginHorizontal: 16, padding: 14, marginBottom: 14 },
  whenLabel: { color: '#BDBDBD', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#FFD000', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#FFD000' },
  chipDisabled: { opacity: 0.3 },
  chipText: { color: '#FFD000', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#000000' },
  timeRowWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  stepper: { alignItems: 'center', marginRight: 8 },
  stepBtn: { color: '#FFD000', fontSize: 18, padding: 4 },
  timeText: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  nowButton: { borderWidth: 1, borderColor: '#FFD000', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18 },
  nowButtonText: { color: '#FFD000', fontWeight: '600' },
  summary: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  pastWarning: { color: '#ef4444', fontSize: 12, textAlign: 'center', marginTop: 6 },

  legend: { flexDirection: 'row', justifyContent: 'center', marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: '#BDBDBD', fontSize: 12 },

  lot: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 8 },
  column: { justifyContent: 'flex-start', marginHorizontal: 2 },
  slotIconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lane: { width: 18, alignItems: 'center', marginHorizontal: 2 },
  laneCenter: { width: 34 },
  laneDashes: { flex: 1, justifyContent: 'space-evenly', alignItems: 'center' },
  dash: { width: 4, height: 16, backgroundColor: '#FFD000' },
  laneLabel: {
    color: '#FFFFFF',
    position: 'absolute',
    top: '42%',
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    backgroundColor: '#000000',
    paddingVertical: 2,
  },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  popup: { width: '100%', maxWidth: 340, backgroundColor: '#171717', borderRadius: 16, borderWidth: 1, borderColor: '#FFD000', padding: 24, alignItems: 'center' },
  popupIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  popupTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  popupPrice: { color: '#FFD000', fontSize: 16, fontWeight: '600', marginTop: 4 },
  popupWindow: { color: '#BDBDBD', fontSize: 13, textAlign: 'center', marginTop: 10, marginBottom: 18 },
  bookButton: { backgroundColor: '#FFD000', paddingVertical: 14, borderRadius: 10, alignSelf: 'stretch' },
  bookButtonText: { color: '#000000', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  closeButton: { marginTop: 12 },
  closeButtonText: { color: '#BDBDBD', fontSize: 14 },
  detailBox: { alignSelf: 'stretch', backgroundColor: '#000000', borderRadius: 10, padding: 14, marginTop: 14, marginBottom: 16 },
  detailRow: { color: '#FFFFFF', fontSize: 14, marginBottom: 4 },
  cancelBookingButton: { backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 10, alignSelf: 'stretch' },
  cancelBookingText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});