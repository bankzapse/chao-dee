"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalButton } from "@/components/modal";
import { Spinner } from "@/components/spinner";
import { createClient } from "@/lib/supabase/client";
import {
  listContractDocuments,
  deleteContractDocument,
  type ContractDocView,
} from "./actions";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "contract", label: "สัญญาเช่า" },
  { value: "other", label: "อื่น ๆ" },
];
const typeLabel = (v: string) => DOC_TYPES.find((d) => d.value === v)?.label ?? "อื่น ๆ";

export function ContractDocsButton({ contractId }: { contractId: string }) {
  return (
    <ModalButton label="📎 เอกสาร" title="เอกสารสัญญาเช่า" variant="secondary">
      {() => <DocsPanel contractId={contractId} />}
    </ModalButton>
  );
}

function DocsPanel({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [docs, setDocs] = useState<ContractDocView[] | null>(null);
  const [docType, setDocType] = useState("contract");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setDocs(await listContractDocuments(contractId));
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload() {
    if (!file) return setErr("กรุณาเลือกไฟล์");
    setBusy(true);
    setErr("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      // encode doc_type ไว้ในชื่อไฟล์ (ไม่ต้องมีตาราง)
      const path = `contracts/${contractId}/${docType}__${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("documents").upload(path, file);
      if (up.error) {
        setErr("อัปโหลดไม่สำเร็จ: " + up.error.message);
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
    await deleteContractDocument(id);
    await load();
    router.refresh();
  }

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">เพิ่มเอกสาร / ถ่ายรูป</p>
        <div className="flex flex-col gap-2">
          <select className="field" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="field"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <button className="btn-primary inline-flex items-center justify-center gap-2" onClick={upload} disabled={busy || !file}>
            {busy && <Spinner />}
            {busy ? "กำลังอัปโหลด…" : "อัปโหลด"}
          </button>
        </div>
      </div>

      {docs === null ? (
        <p className="text-sm text-slate-400">กำลังโหลด…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีเอกสาร — แนบไฟล์สัญญาเช่าหรือเอกสารอื่นๆ ได้</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {docs.map((d) => (
            <div key={d.path} className="overflow-hidden rounded-xl border border-slate-200">
              <a href={d.url} target="_blank" rel="noreferrer" className="block bg-slate-50">
                {isImage(d.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.url} alt={typeLabel(d.doc_type)} className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center text-4xl">📄</div>
                )}
              </a>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium text-slate-600">{typeLabel(d.doc_type)}</span>
                <button onClick={() => remove(d.path)} className="text-xs font-medium text-rose-600 hover:text-rose-700">
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
