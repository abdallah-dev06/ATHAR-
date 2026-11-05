import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مَنَصَّة أَثَر | Athar Hub - إدارة وجدولة قنوات التلجرام",
  description:
    "المنصة المستقلة لإدارة وأتمتة وبث المحتوى القرآني والأدبي والفكري عبر قنوات التلجرام @natharat06 و @nasmat1448",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
        {children}
      </body>
    </html>
  );
}
