import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Alert } from '../components/Popup';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function SignUpScreen({ navigation }) {
  const { setProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (fullName.trim().length < 2 || !/^[A-Za-z][A-Za-z\s'.-]*$/.test(fullName.trim())) {
      Alert.alert('Invalid name', 'Name must contain letters only (min 2 characters).');
      return;
    }
    if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s()-]/g, ''))) {
      Alert.alert('Invalid phone', 'Enter a valid phone number (7 to 15 digits).');
      return;
    }
    if (!vehicleReg.trim() || !/^[A-Z0-9\s-]{3,12}$/.test(vehicleReg.trim().toUpperCase())) {
      Alert.alert('Invalid vehicle number', 'Enter a valid registration number (3 to 12 letters/digits).');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const data = {
        uid: cred.user.uid,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        vehicleReg: vehicleReg.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'customers', cred.user.uid), data);
      setProfile(data);
      Alert.alert('Sign up successful', 'Welcome, ' + data.fullName + '! You are now logged in.');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use' ? 'This email is already registered.' : err.message;
      Alert.alert('Sign up failed', msg);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000000' }} behavior="padding">
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="e.g. John Smith" value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Email</Text>
        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="you@email.com" keyboardType="email-address"
          autoCapitalize="none" value={email} onChangeText={setEmail} />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="e.g. +230 5xxx xxxx" keyboardType="phone-pad"
          value={phone} onChangeText={setPhone} />

        <Text style={styles.label}>Vehicle Registration</Text>
        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="e.g. ABC1234" autoCapitalize="characters"
          value={vehicleReg} onChangeText={setVehicleReg} />

        <Text style={styles.label}>Password</Text>
        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="At least 6 characters" secureTextEntry
          value={password} onChangeText={setPassword} />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="Re-enter password" secureTextEntry
          value={confirmPassword} onChangeText={setConfirmPassword} />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp}>
          <Text style={styles.primaryButtonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF', backgroundColor: '#171717', borderRadius: 8, padding: 14, fontSize: 15 },
  primaryButton: { backgroundColor: '#FFD000', paddingVertical: 16, borderRadius: 10, marginTop: 28 },
  primaryButtonText: { color: '#000000', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  linkButton: { marginTop: 18 },
  linkText: { color: '#FFD000', textAlign: 'center' },
});