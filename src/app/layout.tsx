import type { Metadata } from "next";
import { Rajdhani } from "next/font/google"; // Updated Font
import "./globals.css";
import ThirdwebAppProvider from "../../components/ThirdwebAppProvider";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://portal.ie.theutilityfoundation.org/"),
  title: "Invisible Enemies: Supporting Veterans and Mental Wellness",
  description: "Empowering veterans and communities through mental wellness support and camaraderie.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/Medallions/IE.png",
    apple: "/Medallions/IE.png",
  },
  openGraph: {
    title: "Invisible Enemies: Supporting Veterans and Mental Wellness",
    description:
      "Invisible Enemies is a veteran-focused community dedicated to raising awareness about mental health challenges, including PTSD, depression, and anxiety. Our mission is to create a supportive, fun, and financially empowering environment where veterans and their supporters can thrive together. Join us as we work towards building a future where no one fights their battles alone.",
    type: "website",
    url: "https://portal.ie.theutilityfoundation.org/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Invisible Enemies: Empowering Veterans and Mental Wellness",
    description:
      "Join Invisible Enemies, a community supporting veterans through mental wellness, fun, and financial independence. Together, we can raise awareness and ensure that no one fights their invisible battles alone.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Invisible Enemies",
  },
  alternates: {
    canonical: "https://portal.ie.theutilityfoundation.org/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ffffff" />

        {/* Safe guard: normalize 2-letter region codes to 3-letter ISO currency codes for Intl.NumberFormat */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const regionToCurrency = {
      US: 'USD', GB: 'GBP', UK: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
      JP: 'JPY', CN: 'CNY', KR: 'KRW', IN: 'INR', SG: 'SGD', BR: 'BRL', MX: 'MXN',
      CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', IL: 'ILS', SA: 'SAR', AE: 'AED',
      ZA: 'ZAR', HK: 'HKD', TW: 'TWD', TH: 'THB', PH: 'PHP', MY: 'MYR', ID: 'IDR',
      VN: 'VND', TR: 'TRY', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN',
      HR: 'HRK', IS: 'ISK'
    };
    const OriginalNumberFormat = Intl.NumberFormat;
    function PatchedNumberFormat(locale, options, ...rest) {
      if (
        options && typeof options === 'object' &&
        options.style === 'currency' && typeof options.currency === 'string'
      ) {
        const cur = options.currency.toUpperCase();
        if (cur.length === 2 && regionToCurrency[cur]) {
          const newOptions = { ...options, currency: regionToCurrency[cur] };
          return new OriginalNumberFormat(locale, newOptions, ...rest);
        }
      }
      return new OriginalNumberFormat(locale, options, ...rest);
    }
    PatchedNumberFormat.prototype = OriginalNumberFormat.prototype;
    // @ts-ignore
    Intl.NumberFormat = PatchedNumberFormat;
  } catch (_) { /* no-op */ }
})();`,
          }}
        />
      </head>
      <body className={`${rajdhani.variable} font-sans`} suppressHydrationWarning>
        <ThirdwebAppProvider>
          {children}
        </ThirdwebAppProvider>
      </body>
    </html>
  );
}
