import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { Card, Field, Notice, useFieldStyles } from '../../../components/ScreenLayout';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useTheme } from '../../../theme/ThemeProvider';

export function LoginScreen() {
  const { theme } = useTheme();
  const fieldStyles = useFieldStyles();
  const { login } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const handleSubmit = async () => {
    if (!email.trim() || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    try { setLoading(true); setError(null); await login({ email: email.trim(), password }); }
    catch (err) {
      setError(err instanceof TypeError
        ? 'Không kết nối được máy chủ. Kiểm tra mạng và thử đăng nhập lại.'
        : err instanceof Error ? err.message : 'Không thể đăng nhập.');
    }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={fieldStyles.screen}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 24 }}>
        <View style={{ gap: 12 }}><Text style={{ color: theme.colors.info, fontWeight: '800', letterSpacing: 2 }}>TOS-MOBILE / ICD FIELD</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontWeight: '800' }}>Tác nghiệp hiện trường</Text>
          <Text style={fieldStyles.muted}>Tiếp nhận cổng, xếp bãi và kiểm định container.</Text></View>
        <Card title="Đăng nhập tài khoản ICD">
          {error ? <Notice message={error} /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="Nhập email được cấp" editable={!loading} />
          <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Nhập mật khẩu" editable={!loading} onSubmitEditing={() => void handleSubmit()} />
          <PrimaryButton title="Đăng nhập" loading={loading} onPress={() => void handleSubmit()} />
        </Card>
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
