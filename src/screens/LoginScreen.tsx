// src/screens/LoginScreen.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

interface LoginScreenProps {
  onLoginSuccess: (email: string, token: string) => void;
  backendUrl: string;
}

export default function LoginScreen({
  onLoginSuccess,
  backendUrl,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Por favor ingresa tu email y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.error || "Credenciales inválidas.");
        return;
      }

      if (data.user?.role !== "provider") {
        Alert.alert("Error", "Esta app es solo para proveedores.");
        return;
      }

      if (data.setupStep !== "COMPLETE") {
        Alert.alert(
          "Perfil incompleto",
          "Debes completar tu perfil en la web antes de usar la app.",
        );
        return;
      }

      onLoginSuccess(data.user.email, data.token);
    } catch (e) {
      Alert.alert("Error", "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>CV</Text>
          </View>
          <Text style={styles.appName}>CallsVideo</Text>
          <Text style={styles.appSub}>Panel del Proveedor</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>
            ¿No tienes cuenta? Regístrate en{"\n"}
            <Text style={styles.footerLink}>callvideo-seven.vercel.app</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4f8ef7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  appName: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  appSub: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  form: {
    gap: 8,
  },
  label: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    color: "#ffffff",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#4f8ef7",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  footer: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 20,
  },
  footerLink: {
    color: "#4f8ef7",
    fontWeight: "700",
  },
});
