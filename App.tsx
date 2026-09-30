// CallsVideoProvider/App.tsx

import { useEffect, useState, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert } from "react-native";
import { io, Socket } from "socket.io-client";

import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import IncomingCallScreen from "./src/screens/IncomingCallScreen";
import { startRingtone, stopRingtone } from "./src/services/ringtone";
import Constants from "expo-constants";

const Stack = createNativeStackNavigator();
const BACKEND_URL = "https://callvideo-backend.onrender.com";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [providerEmail, setProviderEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [incomingCall, setIncomingCall] = useState<any>(null);

  // ✅ Socket vive aquí — persiste en todas las pantallas
  const socketRef = useRef<Socket | null>(null);

  // 📢 CREAR CANAL SIEMPRE AL ABRIR LA APP
  useEffect(() => {
    const setupChannel = async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("incoming_calls", {
            name: "Llamadas Entrantes",
            importance: Notifications.AndroidImportance.MAX,
            sound: "default",
            enableVibrate: true,
            vibrationPattern: [0, 500, 200, 500, 200, 500],
            enableLights: true,
            lightColor: "#4f8ef7",
            bypassDnd: true,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
          });
          const channels = await Notifications.getNotificationChannelsAsync();
          console.log(
            "📢 Canales existentes:",
            channels.map((c) => c.id),
          );
        }
      } catch (e) {
        console.log("❌ Error creando canal:", e);
      }
    };
    setupChannel();
  }, []);

  // ─────────────────────────────────────────────
  // Verificar sesión guardada al arrancar
  // ─────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const email = await AsyncStorage.getItem("userEmail");
        if (token && email) {
          setProviderEmail(email);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.log("Error leyendo sesión:", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // 🔕 Si la llamada entrante se limpia por cualquier razón, detener timbre
  useEffect(() => {
    if (!incomingCall) {
      stopRingtone();
    }
  }, [incomingCall]);

  // ─────────────────────────────────────────────
  // Si el usuario toca la notificación con la app cerrada,
  // al arrancar debemos abrir la pantalla de llamada
  // ─────────────────────────────────────────────
  useEffect(() => {
    const checkLastNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        const data = response.notification.request.content.data;
        if (data?.type === "incoming_call") {
          setIncomingCall(data);
        }
      }
    };
    checkLastNotification();
  }, []);

  // ─────────────────────────────────────────────
  // Conectar socket cuando el proveedor está logueado
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !providerEmail) return;

    // Limpiar socket anterior si existe
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(BACKEND_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Socket conectado en App.tsx:", socket.id);
      socket.emit("register_user", providerEmail);
    });

    socket.on("reconnect", () => {
      console.log("🔄 Socket reconectado, re-registrando:", providerEmail);
      socket.emit("register_user", providerEmail);
    });

    // ✅ Escuchar llamada entrante aquí — socket siempre activo
    socket.on("incoming_call", (data: any) => {
      console.log("📞 Llamada entrante en App.tsx:", data);
      setIncomingCall(data);
      startRingtone(); // 👈 NUEVO
    });

    socket.on("call_ended", () => {
      console.log("📴 call_ended recibido en App.tsx");
      setIncomingCall(null);
      stopRingtone(); // 👈 NUEVO
    });

    socket.on("call_rejected", () => {
      setIncomingCall(null);
      stopRingtone(); // 👈 NUEVO
    });

    // 🆕 AGREGAR ESTE LISTENER:
    socket.on("call_answered_elsewhere", (data: { callSessionId: string }) => {
      console.log("📞 Llamada contestada en otro dispositivo:", data);
      setIncomingCall(null);
      stopRingtone(); // Detener timbre
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      socket.off("call_answered_elsewhere"); // 👈 AGREGAR
    };
  }, [isLoggedIn, providerEmail]);

  // ─────────────────────────────────────────────
  // Registrar push notifications
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn || !providerEmail) return;

    const registerForPush = async () => {
      if (!Device.isDevice) return;

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("incoming_calls", {
          name: "Llamadas Entrantes",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          enableVibrate: true,
          vibrationPattern: [0, 500, 200, 500, 200, 500],
          enableLights: true,
          lightColor: "#4f8ef7",
          bypassDnd: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        console.log("✅ Canal incoming_calls creado");
      }

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        console.log("📲 FCM Token:", tokenData.data);

        await fetch(`${BACKEND_URL}/api/push/subscribe-expo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerEmail, expoToken: tokenData.data }),
        });
        console.log("✅ Token registrado en backend");
      } catch (e) {
        console.log("❌ Error registrando token:", e);
      }
    };

    registerForPush();
  }, [isLoggedIn, providerEmail]);

  // ─────────────────────────────────────────────
  // Escuchar notificaciones push
  // ─────────────────────────────────────────────
  useEffect(() => {
    const foregroundSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        if (data?.type === "incoming_call") {
          setIncomingCall(data);
        }
      },
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const action = response.actionIdentifier;

        if (data?.type === "incoming_call") {
          if (action === "reject") {
            socketRef.current?.emit("reject_call", {
              clientEmail: data.clientEmail,
              callSessionId: data.callSessionId,
            });
          } else {
            setIncomingCall(data);
          }
        }
      },
    );

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, []);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────
  const handleLoginSuccess = async (email: string, token: string) => {
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("userEmail", email);
    setProviderEmail(email);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userEmail");
    setProviderEmail(null);
    setIsLoggedIn(false);
  };

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen
                {...props}
                onLoginSuccess={handleLoginSuccess}
                backendUrl={BACKEND_URL}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Dashboard">
              {(props) => (
                <DashboardScreen
                  {...props}
                  providerEmail={providerEmail!}
                  onLogout={handleLogout}
                  incomingCall={incomingCall}
                  onClearIncomingCall={() => setIncomingCall(null)}
                  backendUrl={BACKEND_URL}
                  // ✅ Pasamos el socket global a las pantallas
                  socket={socketRef.current}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="IncomingCall">
              {(props) => (
                <IncomingCallScreen
                  {...props}
                  callData={incomingCall}
                  providerEmail={providerEmail!}
                  backendUrl={BACKEND_URL}
                  onClose={() => setIncomingCall(null)}
                  // ✅ Pasamos el socket global
                  socket={socketRef.current}
                  ratePerMinute={incomingCall?.ratePerMinute || 0}
                />
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
