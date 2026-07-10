"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABEL } from "@/lib/listings";
import type { LeadStatus } from "@/lib/types";
import { updateLeadStatus } from "../actions";

export function LeadStatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateLeadStatus(leadId, e.target.value as LeadStatus);
          router.refresh();
        })
      }
      className="field w-auto text-sm"
    >
      {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
