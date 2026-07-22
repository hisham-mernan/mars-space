import localFont from "next/font/local";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { LanguageProvider } from "../context/LanguageContext";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-arabic",
  display: "swap",
});

const thmanyahSans = localFont({
  src: [
    { path: "../../thmanyahsans/woff2/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "../../thmanyahsans/woff2/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../thmanyahsans/woff2/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../thmanyahsans/woff2/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../thmanyahsans/woff2/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-thmanyah-sans",
  fallback: ["IBM Plex Sans Arabic", "system-ui", "-apple-system", "sans-serif"],
  display: "swap",
});

export const metadata = {
  title: "Mars Space — Enterprise Coworking, Private Offices & Space ERP",
  description: "Enterprise private offices, meeting rooms, and physical space management in Saudi Arabia. Book hourly or monthly.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${thmanyahSans.variable} ${ibmPlexSansArabic.variable} ${thmanyahSans.className} h-full antialiased`}>
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${thmanyahSans.className} h-full`}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
