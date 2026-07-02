import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/action-form";
import { formatDate } from "@/lib/format";
import {
  AddAnnouncementButton,
  SendAnnouncementButton,
} from "./announcement-buttons";
import { deleteAnnouncement } from "./actions";

type Announcement = {
  id: string;
  title: string;
  body: string;
  sent_at: string | null;
  recipients: number;
  created_at: string;
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (data ?? []) as Announcement[];

  return (
    <div>
      <PageHeader
        title="ประกาศผ่าน LINE"
        subtitle="ส่งข่าวสารถึงผู้เช่าที่ผูกบัญชี LINE"
        action={<AddAnnouncementButton />}
      />

      {list.length === 0 ? (
        <EmptyState
          title="ยังไม่มีประกาศ"
          description="เขียนประกาศแล้วส่งถึงผู้เช่าผ่าน LINE ได้ทันที"
          action={<AddAnnouncementButton />}
        />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">📢 {a.title}</h3>
                  {a.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                  )}
                </div>
                {a.sent_at ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    ส่งแล้ว · {a.recipients} คน
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500">ฉบับร่าง</Badge>
                )}
              </div>
              <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm">
                <span className="text-xs text-slate-400">
                  {a.sent_at ? `ส่งเมื่อ ${formatDate(a.sent_at)}` : `สร้าง ${formatDate(a.created_at)}`}
                </span>
                <div className="ml-auto flex items-center gap-4">
                  <SendAnnouncementButton id={a.id} />
                  <DeleteButton
                    action={deleteAnnouncement.bind(null, a.id)}
                    confirmText="ลบประกาศนี้?"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
