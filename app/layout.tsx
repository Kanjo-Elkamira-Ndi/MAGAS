import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAGAS — Gas Cylinder Delivery",
  description:
    "Order household gas cylinders for delivery from local retailers across Cameroon.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
