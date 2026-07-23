import type { Metadata } from "next";

const title = "Verify a CCA Certificate";
const description =
  "Verify the authenticity of a Codezela Career Accelerator certificate using its certificate ID.";
const canonicalPath = "/cca/certificate";
const imagePath = "/cca/certificate/opengraph-image";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: canonicalPath,
  },
  openGraph: {
    type: "website",
    url: canonicalPath,
    siteName: "Codezela Career Accelerator",
    locale: "en_LK",
    title,
    description,
    images: [
      {
        url: imagePath,
        width: 1200,
        height: 630,
        alt: "Verify a Codezela Career Accelerator certificate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [imagePath],
  },
};

export default function CertificateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
