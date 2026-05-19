import type { Metadata } from "next";

import "./globals.css";

import Navbar from "@/components/Navbar";

import { AuthProvider } from "../context/AuthContext";

export const metadata: Metadata = {
  title: "Hydrogen Lab Safety",
  description: "Hydrogen Training Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <html lang="en">

      <head>

        <link
          href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;800&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />

      </head>

      <body>

        <AuthProvider>

          <div className="page-wrap">

            <Navbar />

            {children}

          </div>

        </AuthProvider>

      </body>

    </html>

  );

}