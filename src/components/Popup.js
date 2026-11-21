import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';

let showPopup = null;

// Drop-in replacement for React Native's Alert: Alert.alert(title, message, buttons)
export const Alert = {
  alert(title, message, buttons) {
    if (showPopup) showPopup({ title, message, buttons });
  },
};

export function PopupHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    showPopup = (p) => setQueue((q) => [...q, p]);
    return () => {
      showPopup = null;
    };
  }, []);

  const current = queue[0];
  const buttons = current?.buttons?.length ? current.buttons : [{ text: 'OK' }];
  const row = buttons.length === 2;

  const press = (btn) => {
    setQueue((q) => q.slice(1));
    if (btn.onPress) btn.onPress();
  };

  // Back button / tapping outside: acts as Cancel (or OK when there is only one button)
  const dismiss = () => {
    const cancel = buttons.find((b) => b.style === 'cancel') || (buttons.length === 1 ? buttons[0] : null);
    if (cancel) press(cancel);
  };

  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable style={styles.popup} onPress={() => {}}>
          {!!current?.title && <Text style={styles.title}>{current.title}</Text>}
          {!!current?.message && <Text style={styles.message}>{current.message}</Text>}

          <View style={row ? styles.buttonsRow : styles.buttonsColumn}>
            {buttons.map((btn, i) => {
              const destructive = btn.style === 'destructive';
              const cancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    row && { flex: 1, marginHorizontal: 4 },
                    destructive && styles.buttonDestructive,
                    cancel && styles.buttonCancel,
                  ]}
                  onPress={() => press(btn)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      destructive && { color: '#FFFFFF' },
                      cancel && { color: '#FFD000' },
                    ]}
                  >
                    {btn.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  popup: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#171717',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD000',
    padding: 22,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  message: { color: '#BDBDBD', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  buttonsRow: { flexDirection: 'row', marginTop: 20 },
  buttonsColumn: { marginTop: 20 },
  button: { backgroundColor: '#FFD000', paddingVertical: 13, borderRadius: 10, marginBottom: 8 },
  buttonDestructive: { backgroundColor: '#ef4444' },
  buttonCancel: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FFD000' },
  buttonText: { color: '#000000', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});