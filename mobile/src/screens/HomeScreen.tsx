import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { supabase } from "../lib/supabase";
import { DashboardScreen } from "./DashboardScreen";
import { MeterScreen } from "./MeterScreen";

type Tab = "dashboard" | "meter";

export function HomeScreen() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>ChaoDee</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signout}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {tab === "dashboard" ? <DashboardScreen /> : <MeterScreen />}
      </View>

      <View style={styles.tabbar}>
        <TabButton label="📊 แดชบอร์ด" active={tab === "dashboard"} onPress={() => setTab("dashboard")} />
        <TabButton label="🔢 จดมิเตอร์" active={tab === "meter"} onPress={() => setTab("meter")} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  brand: { fontSize: 18, fontWeight: "700", color: "#4f46e5" },
  signout: { color: "#64748b", fontSize: 14 },
  body: { flex: 1 },
  tabbar: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0", backgroundColor: "#fff",
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabText: { color: "#94a3b8", fontSize: 14 },
  tabTextActive: { color: "#4f46e5", fontWeight: "700" },
});
