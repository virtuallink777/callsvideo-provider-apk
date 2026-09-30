import { Audio } from "expo-av";

let sound: Audio.Sound | null = null;

export async function startRingtone() {
  try {
    await Audio.setAudioModeAsync({ allowsPlayingSilentIOS: true } as any);
    if (sound) return; // ya está sonando
    const { sound: s } = await Audio.Sound.createAsync(
      require("../../assets/ringtone.mp3"),
      { shouldPlay: true, isLooping: true, volume: 1.0 },
    );
    sound = s;
    console.log("🔔 Timbre sonando");
  } catch (e) {
    console.log("❌ Error ringtone:", e);
  }
}

export async function stopRingtone() {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
      console.log("🔕 Timbre detenido");
    }
  } catch {}
}
