import { useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, RefreshControl } from "react-native";
import { supabase } from "../lib/supabase";

type Stats = { occupancy: number; occupied: number; total: number; revenue: number; vacant: number };

function baht(n: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
}

export function DashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [{ data: rooms }, { data: contracts }] = await Promise.all([
      supabase.from("rooms").select("status"),
      supabase.from("contracts").select("rent_amount").eq("status", "active"),
    ]);
    const total = rooms?.length ?? 0;
    const occupied = (rooms ?? []).filter((r) => r.status === "occupied").length;
    const vacant = (rooms ?? []).filter((r) => r.status === "vacant").length;
    const revenue = (contracts ?? []).reduce((s, c) => s + Number(c.rent_amount), 0);
    setStats({
      total, occupied, vacant, revenue,
      occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0,
    });
  }

  useEffect(() => { load(); }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true); await load(); setRefreshing(false);
        }} />
      }
    >
      <Text style={styles.title}>ภาพรวม</Text>
      <View style={styles.grid}>
        <Card label="อัตราเข้าพัก" value={`${stats?.occupancy ?? 0}%`} hint={`${stats?.occupied ?? 0}/${stats?.total ?? 0} ห้อง`} color="#4f46e5" />
        <Card label="รายได้/เดือน" value={baht(stats?.revenue ?? 0)} color="#10b981" />
        <Card label="ห้องว่าง" value={String(stats?.vacant ?? 0)} color="#f59e0b" />
        <Card label="ห้องทั้งหมด" value={String(stats?.total ?? 0)} color="#64748b" />
      </View>
    </ScrollView>
  );
}

function Card({ label, value, hint, color }: { label: string; value: string; hint?: string; color: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%", backgroundColor: "#fff", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  cardLabel: { color: "#64748b", fontSize: 13 },
  cardValue: { fontSize: 22, fontWeight: "700", marginTop: 6 },
  cardHint: { color: "#94a3b8", fontSize: 11, marginTop: 4 },
});
