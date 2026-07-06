"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { createClient } from "@/lib/supabase/client";
import {
  listTenantDocuments,
  addTenantDocument,
  deleteTenantDocument,
  type TenantDocView,
} from "./actions";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "id_card", label: "บัตรประชาชน" },
  { value: "house_reg", label: "สำเนาทะเบียนบ้าน" },
  { value: "contract", label: "สัญญา/เอกสารเซ็น" },
  { value: "other", label: "อื่น ๆ" },
];
const typeLabel = (v: string) => DOC_TYPES.find((d) => d.value === v)?.label ?? "อื่น ๆ";

export function TenantDocsButton({ tenantId, count }: { tenantId: string; count: number }) {
  return (
    <ModalButton label={`📎 เอกสาร${count > 0 ? ` (${count})` : ""}`} title="เอกสารผู้เช่า" variant="secondary">
      {() => <DocsPanel tenantId={tenantId} />}
    </ModalButton>
  );
}

function DocsPanel({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [docs, setDocs] = useState<TenantDocView[] | null>(null);
  const [docType, setDocType] = useState("id_card");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setDocs(await listTenantDocuments(tenantId));
  }
  // โหลดครั้งแรกเมื่อเปิด modal
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file) return setErr("กรุณาเลือกไฟล์รูป");
    setBusy(true);
    setErr("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `tenants/${tenantId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("documents").upload(path, file);
      if (up.error) {
        setErr("อัปโหลดไม่สำเร็จ: " + up.error.message);
        return;
      }
      const res = await addTenantDocument(tenantId, docType, path, "");
      if (res.error) {
        setErr(res.error);
        return;
      }
      setFile(null);
      await load();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("ลบเอกสารนี้?")) return;
    await deleteTenantDocument(id);
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* อัปโหลดใหม่ */}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">เพิ่มเอกสาร / ถ่ายรูป</p>
        <div className="flex flex-col gap-2">
          <select className="field" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          {/* capture=environment → เปิดกล้องหลังบนมือถือ */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="field"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <button className="btn-primary" onClick={upload} disabled={busy || !file}>
            {busy ? "กำลังอัปโหลด…" : "อัปโหลด"}
          </button>
        </div>
      </div>

      {/* รายการเอกสาร */}
      {docs === null ? (
        <p className="text-sm text-slate-400">กำลังโหลด…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีเอกสาร — เก็บรูปบัตรประชาชน/ทะเบียนบ้านไว้เป็นหลักฐานได้</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {docs.map((d) => (
            <div key={d.id} className="overflow-hidden rounded-xl border border-slate-200">
              <a href={d.url} target="_blank" rel="noreferrer" className="block bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.url} alt={typeLabel(d.doc_type)} className="h-32 w-full object-cover" />
              </a>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium text-slate-600">{typeLabel(d.doc_type)}</span>
                <button
                  onClick={() => remove(d.id)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
