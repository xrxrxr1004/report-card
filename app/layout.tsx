import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "양영학원 주간 성적표",
  description: "양영학원 고등 영어과 주간 성적표",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
