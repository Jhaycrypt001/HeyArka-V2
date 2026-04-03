import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeyArka Pro | AI Dashboard",
  description: "Predictive Liquidity Engine and Machine Learning Analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* We set a dark background here so the screen never flashes white */}
      <body className="bg-[#030308] text-white antialiased">
        {children}
      </body>
    </html>
  );
}