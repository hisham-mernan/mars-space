import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { LanguageProvider } from "../context/LanguageContext";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
});

export const metadata = {
  title: "Mars Space — Coworking, Private Offices & Meeting Rooms",
  description: "Private offices, meeting rooms and a community floor in Jeddah, Saudi Arabia, run with the discipline of a venture builder. Book hourly or monthly.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html className={`${ibmPlexSansArabic.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ fontFamily: "var(--font-ibm-plex), system-ui, sans-serif" }}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
