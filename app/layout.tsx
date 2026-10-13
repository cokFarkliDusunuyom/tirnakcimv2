import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tırnakçı — Ankara'da sana en yakın güzellik",
  description: "Ankara'nın en iyi nail artist'lerini keşfet, sana uyan saati seç ve randevunu kolayca oluştur.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
