import { useEffect, useState } from "react";
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase, API_URL } from "../lib/supabase";

type Room = { id: string; room_number: string; building: string };

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MeterScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [busy, setBusy] = useState<string>("");
  const period = currentPeriod();

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles").select("org_id").eq("id", user.user?.id ?? "").single();
      setOrgId(profile?.org_id ?? "");

      const { data } = await supabase
        .from("rooms").select("id, room_number, buildings(name)").order("room_number");
      setRooms(
        (data ?? []).map((r: any) => ({
          id: r.id, room_number: r.room_number, building: r.buildings?.name ?? "-",
        }))
      );
    })();
  }, []);

  async function capture(room: Room, meterType: "water" | "electric") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("ต้องอนุญาตการใช้กล้อง");
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (shot.canceled || !shot.assets[0]?.base64) return;

    setBusy(`${room.id}-${meterType}`);
    try {
      const res = await fetch(`${API_URL}/api/ai/read-meter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: shot.assets[0].base64,
          mediaType: "image/jpeg",
          meterType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        Alert.alert("อ่านค่าไม่สำเร็จ", json.error ?? "");
        return;
      }
      // บันทึกค่า (merge กับค่าที่มีอยู่ของรอบเดือนนี้)
      const { data: existing } = await supabase
        .from("meter_readings")
        .select("water_value, electric_value")
        .eq("room_id", room.id).eq("period", period).maybeSingle();

      const payload = {
        org_id: orgId, room_id: room.id, period,
        water_value: meterType === "water" ? json.value : existing?.water_value ?? 0,
        electric_value: meterType === "electric" ? json.value : existing?.electric_value ?? 0,
        reading_date: new Date().toISOString().slice(0, 10),
      };
      await supabase.from("meter_readings").upsert(payload, { onConflict: "room_id,period" });
      Alert.alert("บันทึกแล้ว", `ห้อง ${room.room_number} ${meterType === "water" ? "น้ำ" : "ไฟ"}: ${json.value}${json.anomaly ? `\n⚠️ ${json.anomaly}` : ""}`);
    } catch {
      Alert.alert("เกิดข้อผิดพลาด", "ตรวจสอบ EXPO_PUBLIC_API_URL");
    } finally {
      setBusy("");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>จดมิเตอร์ · รอบ {period}</Text>
      <Text style={styles.hint}>ถ่ายรูปหน้าปัดมิเตอร์ แล้ว AI จะอ่านค่าให้อัตโนมัติ</Text>

      {rooms.map((r) => (
        <View key={r.id} style={styles.row}>
          <View>
            <Text style={styles.roomNo}>{r.room_number}</Text>
            <Text style={styles.building}>{r.building}</Text>
          </View>
          <View style={styles.actions}>
            <MeterButton label="💧 น้ำ" loading={busy === `${r.id}-water`} onPress={() => capture(r, "water")} />
            <MeterButton label="⚡ ไฟ" loading={busy === `${r.id}-electric`} onPress={() => capture(r, "electric")} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function MeterButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator size="small" color="#4f46e5" /> : <Text style={styles.btnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  hint: { color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 16 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  roomNo: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  building: { fontSize: 12, color: "#94a3b8" },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    borderWidth: 1, borderColor: "#c7d2fe", backgroundColor: "#eef2ff",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 56, alignItems: "center",
  },
  btnText: { color: "#4f46e5", fontWeight: "600" },
});
