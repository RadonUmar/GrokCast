import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrokCast - AI Video Interaction Demo",
  description: "Photorealistic AI video interaction using compositional video states",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
