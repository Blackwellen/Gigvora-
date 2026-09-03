import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_URL, getApiErrorMessage } from '../../src/lib/apiClient';
import { useSession } from '../../src/lib/SessionContext';
import { colors, radius, spacing } from '../../src/lib/theme';

export default function SignInScreen() {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password, deviceTrusted: true });
      if (data.stepUp?.type === 'mfa') {
        setError('This account requires MFA, which is not yet supported in the mobile app.');
        return;
      }
      await login(data.tokens);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Incorrect email or password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to access your Gigvora account.</Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@company.com"
            placeholderTextColor={colors.ink400}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••••"
            placeholderTextColor={colors.ink400}
            style={styles.input}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !email || !password}
          >
            <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Sign in'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  logo: { width: 48, height: 48, borderRadius: radius.md, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink500, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink800, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.ink200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink900,
  },
  error: { color: colors.red500, fontSize: 13, marginTop: spacing.md },
  button: {
    backgroundColor: colors.brand600,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
