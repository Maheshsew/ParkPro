import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Alert } from '../components/Popup';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Enter email and password.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', 'Wrong email or password.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000000' }} behavior="padding">
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo1.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Login</Text>

        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="Email" autoCapitalize="none"
          keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput placeholderTextColor="#BDBDBD" selectionColor="#FFD000" keyboardAppearance="dark"
          style={styles.input} placeholder="Password" secureTextEntry
          value={password} onChangeText={setPassword} />

        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.linkText}>No account? Sign up</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#000000', padding: 24, justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#2A2A2A', color: '#FFFFFF', backgroundColor: '#171717', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 15 },
  primaryButton: { backgroundColor: '#FFD000', paddingVertical: 16, borderRadius: 10, marginTop: 10 },
  primaryButtonText: { color: '#000000', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  linkButton: { marginTop: 18 },
  linkText: { color: '#FFD000', textAlign: 'center' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 16, borderRadius: 20 },
});