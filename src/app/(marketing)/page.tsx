import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "Prostheia — Dental CAD Practice & Learning",
  description:
    "Practice dental CAD in a browser-based learning environment with guided exercises, synthetic training scenarios, and an independent Free Lab.",
  openGraph: {
    title: "Prostheia — Dental CAD Practice & Learning",
    description:
      "A browser-based educational environment for learning and practicing digital dental workflows.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Prostheia — Dental CAD Practice & Learning",
    description:
      "A browser-based educational environment for learning and practicing digital dental workflows.",
  },
};

export default function Home() {
  return <LandingPage />;
}
