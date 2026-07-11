export type BankInfo = {
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
};

/** กล่องแสดงบัญชีธนาคารสำหรับโอนเงิน (ไม่แสดงถ้าไม่มีเลขบัญชี) */
export function BankInfoBox({ bank }: { bank: BankInfo }) {
  if (!bank.bank_account_no) return null;
  return (
    <div className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-center text-sm">
      <p className="text-xs text-slate-400">หรือโอนผ่านบัญชีธนาคาร</p>
      {bank.bank_name && <p className="mt-0.5 font-medium text-slate-700">{bank.bank_name}</p>}
      <p className="text-lg font-bold tracking-wide text-slate-900">{bank.bank_account_no}</p>
      {bank.bank_account_name && <p className="text-xs text-slate-500">{bank.bank_account_name}</p>}
    </div>
  );
}
