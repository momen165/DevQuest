import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "DevQuest - Interactive Coding Education Platform",
  description: "Master coding with DevQuest's interactive platform. Learn Python, JavaScript, Java, C++ and more through hands-on exercises, real-time feedback, and gamified learning paths.",
  keywords: "coding education, programming courses, learn to code, Python, JavaScript, Java, C++, interactive coding, programming tutorial, coding platform, developer education",
  authors: [{ name: "DevQuest" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    url: "https://www.dev-quest.me/",
    title: "DevQuest - Interactive Coding Education Platform",
    description: "Master coding with DevQuest's interactive platform. Learn Python, JavaScript, Java, C++ and more through hands-on exercises, real-time feedback, and gamified learning paths.",
    images: [
      {
        url: "https://www.dev-quest.me/websiteicon.ico",
        alt: "DevQuest Logo"
      }
    ],
    siteName: "DevQuest",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevQuest - Interactive Coding Education Platform",
    description: "Master coding with DevQuest's interactive platform. Learn Python, JavaScript, Java, C++ and more through hands-on exercises, real-time feedback, and gamified learning paths.",
    images: ["https://www.dev-quest.me/websiteicon.ico"],
  },
  icons: {
    icon: "/websiteicon.ico",
    apple: "/websiteicon.ico",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//api.dev-quest.me" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "name": "DevQuest",
              "description": "Interactive coding education platform offering courses in Python, JavaScript, Java, C++ and more",
              "url": "https://www.dev-quest.me",
              "logo": "https://www.dev-quest.me/websiteicon.ico",
              "sameAs": [],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": "English"
              },
              "offers": {
                "@type": "Offer",
                "category": "Education",
                "description": "Interactive coding courses and programming education"
              }
            })
          }}
        />
      </head>
      <body>
        <Providers>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          {children}
        </Providers>
      </body>
    </html>
  );
}
