import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = { title: "สมัครใช้งาน" };

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
              ช
            </span>
            <span className="font-bold text-slate-900">ChaoDee</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">สมัครใช้งาน ChaoDee</h1>
          <p className="mt-1 text-sm text-slate-500">
            เริ่มทดลองใช้ฟรี 30 วัน ไม่ต้องผูกบัตร — กรอกข้อมูลหอพักของคุณ
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <SignupForm />
        </div>
      </main>
    </div>
  );
}
