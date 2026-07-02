import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChaoDee (เช่าดี) — ระบบจัดการหอพัก คอนโด อพาร์ตเมนต์",
  description: "จัดการอาคาร ห้องพัก ผู้เช่า สัญญา บิล และค่าใช้จ่าย ครบวงจร",
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
