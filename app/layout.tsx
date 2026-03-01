import type { Metadata } from "next";
import { Suspense } from "react";

import { QueryParamToasts } from "@/components/shared/query-param-toasts";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

export const metadata: Metadata = {
  title: "BDMS",
  description: "BDMS frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Suspense fallback={null}>
          <QueryParamToasts />
        </Suspense>
        {children}
        <Toaster closeButton richColors />
      </body>
    </html>
  );
}
