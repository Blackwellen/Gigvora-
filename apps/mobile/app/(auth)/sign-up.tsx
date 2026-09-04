import { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios from 'axios';
import { API_URL, getApiErrorMessage } from '../../src/lib/apiClient';
import { useSession } from '../../src/lib/SessionContext';
import { colors, radius, spacing } from '../../src/lib/theme';

type AccountType = 'individual' | 'recruiter' | 'company';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'individual', label: 'Professional' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'company', label: 'Company' },
];

// Mirrors apps/api/src/modules/auth/auth.validators.js registerSchema's
// password rule exactly, so the client rejects a bad password before it ever
// hits the network.
function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 12) issues.push('at least 12 characters');
  if (!/[a-z]/.test(password)) issues.push('a lowercase letter');
  if (!/[A-Z]/.test(password)) issues.push('an uppercase letter');
  if (!/[0-9]/.test(password)) issues.push('a number');
  if (!/[^a-zA-Z0-9]/.test(password)) issues.push('a special character');
  return issues;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const { login } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const pwIssues = useMemo(() => passwordIssues(password), [password]);
  const emailValid = EMAIL_RE.test(email);
  const canSubmit = firstName.trim() && lastName.trim() && emailValid && pwIssues.length === 0;

  async function handleSubmit() {
    setTouched(true);
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        accountType,
      });
      await login(data.tokens);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Work. Connect. Grow. Join Gigvora in a minute.</Text>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                placeholder="Jamie"
                placeholderTextColor={colors.ink400}
                style={styles.input}
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                placeholder="Rivera"
                placeholderTextColor={colors.ink400}
                style={styles.input}
              />
            </View>
          </View>

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
          {touched && email.length > 0 && !emailValid && <Text style={styles.fieldError}>Enter a valid email address.</Text>}

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            placeholder="••••••••••••"
            placeholderTextColor={colors.ink400}
            style={styles.input}
          />
          {touched && password.length > 0 && pwIssues.length > 0 && (
            <Text style={styles.fieldError}>Password needs {pwIssues.join(', ')}.</Text>
          )}

          <Text style={styles.label}>I am a...</Text>
          <View style={styles.chipsRow}>
            {ACCOUNT_TYPES.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, accountType === opt.value && styles.chipActive]}
                onPress={() => setAccountType(opt.value)}
              >
                <Text style={[styles.chipText, accountType === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, (!canSubmit || submitting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>{submitting ? 'Creating account...' : 'Create account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextStrong}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  logo: { width: 40, height: 40, borderRadius: radius.md, marginBottom: spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink900 },
  subtitle: { fontSize: 14, color: colors.ink500, marginTop: spacing.xs, marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
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
  fieldError: { color: colors.red500, fontSize: 12, marginTop: spacing.xs },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.ink200,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.brand50, borderColor: colors.brand600 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink600 },
  chipTextActive: { color: colors.brand700 },
  error: { color: colors.red500, fontSize: 13, marginTop: spacing.lg },
  button: {
    backgroundColor: colors.brand600,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.ink500, fontSize: 13 },
  linkTextStrong: { color: colors.brand600, fontWeight: '700' },
});
