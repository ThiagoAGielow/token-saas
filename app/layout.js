import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata = {
  title: 'TokenFlow — Build Anything with AI Tokens',
  description:
    'Buy tokens, build AI-powered websites, set up email accounts, connect domains, and rewrite content — all on a transparent pay-as-you-go model. Start free with 100 tokens, no credit card needed.',
  keywords: [
    'AI website builder',
    'token-based SaaS',
    'pay as you go hosting',
    'AI tokens',
    'white label agency',
    'TokenFlow',
  ],
  openGraph: {
    title: 'TokenFlow — Build Anything with AI Tokens',
    description:
      'Start free with 100 tokens. Build websites, domains, email, and more — only pay for what you use.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="bg-[#0a0a0a] text-white font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
