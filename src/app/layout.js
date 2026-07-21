import localFont from "next/font/local";
import { LanguageProvider } from "../context/LanguageContext";
import "./globals.css";

const thmanyahSans = localFont({
  src: [
    { path: "../../public/fonts/thmanyahsans/woff2/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/thmanyahsans/woff2/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/thmanyahsans/woff2/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/thmanyahsans/woff2/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/thmanyahsans/woff2/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-thmanyah-sans",
  display: "swap",
});

const thmanyahSerifDisplay = localFont({
  src: [
    { path: "../../public/fonts/thmanyahserifdisplay/woff2/thmanyahserifdisplay-Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/thmanyahserifdisplay/woff2/thmanyahserifdisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/thmanyahserifdisplay/woff2/thmanyahserifdisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/thmanyahserifdisplay/woff2/thmanyahserifdisplay-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/thmanyahserifdisplay/woff2/thmanyahserifdisplay-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-thmanyah-serif-display",
  display: "swap",
});

export const metadata = {
  title: "Mars Space — Enterprise Coworking, Private Offices & Space ERP",
  description: "Enterprise private offices, meeting rooms, and physical space management in Saudi Arabia. Book hourly or monthly.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html className={`${thmanyahSans.variable} ${thmanyahSerifDisplay.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ fontFamily: "var(--font-thmanyah-sans), var(--font-thmanyah-serif-display), system-ui, sans-serif" }}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
