import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { NavProgress } from "@/components/shared/nav-progress";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MAGAS — Gas Cylinder Delivery",
  description:
    "Order household gas cylinders for delivery from local retailers across Cameroon.",
};

const themeBootstrap = `
try {
  var t = window.localStorage.getItem('magas-theme');
  var dark = t !== 'light';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('light', !dark);
} catch (e) {
  document.documentElement.classList.add('dark');
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background font-sans text-foreground antialiased"
      >
        <NavProgress />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
