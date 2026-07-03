import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chao-dee.com"),
  title: {
    default: "ChaoDee (เช่าดี) — ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์",
    template: "%s · ChaoDee",
  },
  description:
    "จัดการอาคาร ห้องพัก ผู้เช่า สัญญา บิล มิเตอร์ และค่าใช้จ่าย ครบวงจร พร้อม LINE และ AI อ่านมิเตอร์ — ทดลองใช้ฟรี 30 วัน",
  keywords: ["ระบบจัดการหอพัก", "จัดการอพาร์ตเมนต์", "โปรแกรมหอพัก", "จัดการคอนโด", "ออกบิลค่าเช่า", "ChaoDee", "เช่าดี"],
  applicationName: "ChaoDee",
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "https://www.chao-dee.com",
    siteName: "ChaoDee",
    title: "ChaoDee — ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์ ครบวงจร",
    description: "ออกบิลอัตโนมัติ จดมิเตอร์ด้วย AI แจ้งเตือนผ่าน LINE — ทดลองใช้ฟรี 30 วัน",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChaoDee — ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์",
    description: "ออกบิลอัตโนมัติ จดมิเตอร์ด้วย AI แจ้งเตือนผ่าน LINE — ทดลองใช้ฟรี 30 วัน",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${notoThai.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
