/* eslint-disable @typescript-eslint/no-explicit-any */
// ข้อมูลจังหวัด/อำเภอ/ตำบล ของไทย (ฝั่ง server เท่านั้น)
// ถอดรหัสจากชุดข้อมูลบีบอัดของ thai-address-database
import rawDb from "thai-address-database/database/db.json";

type Entry = { tambon: string; amphoe: string; province: string };

function preprocess(input: any): Entry[] {
  let lookup: string[] = [];
  let words: string[] = [];
  let useLookup = false;
  let data = input;

  if (input.lookup && input.words) {
    useLookup = true;
    lookup = String(input.lookup).split("|");
    words = String(input.words).split("|");
    data = input.data;
  }

  const t = (text: any): string => {
    const repl = (m: string) => {
      const ch = m.charCodeAt(0);
      return words[ch < 97 ? ch - 65 : 26 + ch - 97];
    };
    if (!useLookup) return String(text);
    if (typeof text === "number") text = lookup[text];
    return String(text).replace(/[A-Z]/gi, repl);
  };

  const out: Entry[] = [];
  data.forEach((prov: any) => {
    const i = prov.length === 3 ? 2 : 1; // geo db มี code เพิ่ม
    prov[i].forEach((amp: any) => {
      amp[i].forEach((dist: any) => {
        out.push({ tambon: t(dist[0]), amphoe: t(amp[0]), province: t(prov[0]) });
      });
    });
  });
  return out;
}

let _flat: Entry[] | null = null;
function flat(): Entry[] {
  if (!_flat) _flat = preprocess(rawDb as any);
  return _flat;
}

export function getProvinces(): string[] {
  return [...new Set(flat().map((e) => e.province))].sort((a, b) => a.localeCompare(b, "th"));
}

export function getAmphoes(province: string): string[] {
  return [
    ...new Set(flat().filter((e) => e.province === province).map((e) => e.amphoe)),
  ].sort((a, b) => a.localeCompare(b, "th"));
}

export function getTambons(province: string, amphoe: string): string[] {
  return [
    ...new Set(
      flat()
        .filter((e) => e.province === province && e.amphoe === amphoe)
        .map((e) => e.tambon)
    ),
  ].sort((a, b) => a.localeCompare(b, "th"));
}
