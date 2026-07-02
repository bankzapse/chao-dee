import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.logo}>
        <Text style={styles.logoText}>ช</Text>
      </View>
      <Text style={styles.title}>ChaoDee</Text>
      <Text style={styles.subtitle}>สำหรับเจ้าของ/ผู้ดูแลหอพัก คอนโด อพาร์ตเมนต์</Text>

      <TextInput
        style={styles.input}
        placeholder="อีเมล"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f8fafc" },
  logo: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: "#4f46e5",
    alignSelf: "center", justifyContent: "center", alignItems: "center",
  },
  logoText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginTop: 12, color: "#0f172a" },
  subtitle: { textAlign: "center", color: "#64748b", marginBottom: 28 },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12,
  },
  error: { color: "#e11d48", marginBottom: 8 },
  button: {
    backgroundColor: "#4f46e5", borderRadius: 10, paddingVertical: 14, marginTop: 4,
  },
  buttonText: { color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" },
});
