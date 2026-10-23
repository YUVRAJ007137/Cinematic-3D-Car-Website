/**
 * Content and Configuration Manifest
 * All copy, specification figures, color presets, and legal disclosures.
 * Figures marked PLACEHOLDER are artistic/illustrative portfolio data.
 */

export const CONFIG = {
  // Brand & Model Identity
  title: "CHIRON PUR SPORT",
  subtitle: "A CINEMATIC STUDY",
  year: "2024",

  // Model Visibility Options
  SHOW_LOGOS: true, // Set to false for an unbranded neutral aesthetic

  // Default Paint Finish
  DEFAULT_COLOR_KEY: "deep_rosso",

  // Curated Automotive Paint Finishes
  PAINT_PRESETS: {
    deep_rosso: {
      name: "Deep Rosso",
      hex: "#b91c1c",
      metalness: 0.88,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.14,
      accentHex: "#ef4444"
    },
    racing_blue: {
      name: "French Racing Blue",
      hex: "#1d4ed8",
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.14,
      accentHex: "#3b82f6"
    },
    stealth_noir: {
      name: "Stealth Noir",
      hex: "#17171a",
      metalness: 0.75,
      roughness: 0.28,
      clearcoat: 0.9,
      clearcoatRoughness: 0.20,
      accentHex: "#38bdf8"
    },
    liquid_silver: {
      name: "Liquid Silver",
      hex: "#d1d5db",
      metalness: 0.98,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      accentHex: "#94a3b8"
    }
  },

  // Exterior Hero Headline Stats (Chapter 2)
  HERO_STATS: [
    { label: "QUAD-TURBOCHARGED", value: "8.0L W16", note: "Powertrain Architecture" }, // PLACEHOLDER
    { label: "PEAK OUTPUT", value: "1,500 PS", note: "At 6,900 RPM" }, // PLACEHOLDER
    { label: "ACCELERATION", value: "2.3 SEC", note: "0 — 100 KM/H" } // PLACEHOLDER
  ],

  // Exploded View Chapter Callouts (Chapter 3)
  CALLOUTS: {
    body_panels: {
      id: "body_panels",
      badge: "LAYER 01",
      title: "Aerodynamic Shell & Monocoque",
      statValue: "1.9 M²", // PLACEHOLDER
      statLabel: "Active Downforce Surface",
      description: "Sculpted carbon-composite exterior tailored for peak aerodynamic stability, featuring the enlarged horseshoe front intake and fixed 1.90m rear wing.",
      targetAnchor: [0, 0.95, 0.4]
    },
    glass_and_lights: {
      id: "glass_and_lights",
      badge: "LAYER 02",
      title: "Optical Array & Aero Glazing",
      statValue: "9,600 LM", // PLACEHOLDER
      statLabel: "Quad-LED Matrix Lumens",
      description: "Signature quad-LED headlamp units with integrated cooling ducts and lightweight acoustic polycarbonate safety glazing throughout.",
      targetAnchor: [0.55, 0.65, 1.6]
    },
    interior: {
      id: "interior",
      badge: "LAYER 03",
      title: "Ergonomic Pur Sport Cockpit",
      statValue: "Alcantara®", // PLACEHOLDER
      statLabel: "Handcrafted Stitching & Titanium",
      description: "Stripped-back motorsport luxury with high-grip Alcantara surfaces, laser-cut door cards, and driver-centric analog-digital instrumentation.",
      targetAnchor: [0.0, 0.72, 0.05]
    },
    mechanical: {
      id: "mechanical",
      badge: "LAYER 04",
      title: "Powertrain & Structural Subframe",
      statValue: "1,600 NM", // PLACEHOLDER
      statLabel: "Artistic Architecture Placeholder",
      description: "Artistic study of the mid-mounted quad-turbocharged architecture, close-ratio dual-clutch transmission, and rigid torsional subframe.",
      targetAnchor: [0.0, 0.45, -0.65]
    },
    brakes: {
      id: "brakes",
      badge: "LAYER 05",
      title: "Carbon-Ceramic Braking Calipers",
      statValue: "420 MM", // PLACEHOLDER
      statLabel: "Front Rotors & Monobloc Calipers",
      description: "Lightweight titanium 8-piston monobloc front calipers biting massive carbon-silicon-carbide vented discs for extreme deceleration.",
      targetAnchor: [0.72, 0.38, 1.25]
    },
    wheels: {
      id: "wheels",
      badge: "LAYER 06",
      title: "Magnesium Aero Wheel System",
      statValue: "-16 KG", // PLACEHOLDER
      statLabel: "Unsprung Mass Reduction",
      description: "Bespoke lightweight forged magnesium wheels with carbon aero blades engineered to extract brake heat and smooth turbulent airflow.",
      targetAnchor: [0.78, 0.38, 1.25]
    }
  },

  // Detail Close-Ups (Chapter 5)
  DETAILS: [
    {
      title: "QUAD-MATRIX LIGHTING",
      subtitle: "Optical Precision",
      description: "Four compact LED projector modules per cluster with sculpted heat-extraction louvers."
    },
    {
      title: "AERO-RING WHEELS",
      subtitle: "Turbulent Flow Dissipation",
      description: "Magnesium multi-spoke rims matched with Michelin Sport Cup 2R bespoke high-lateral compounds."
    },
    {
      title: "CONTINUOUS LED BLADE",
      subtitle: "Aero Diffuser Integration",
      description: "1.27-meter full-width seamless rear light blade hovering above titanium 3D-printed exhaust tips."
    }
  ],

  // Call To Action & Footer (Chapter 6)
  CTA: {
    headline: "THE PINNACLE OF HYPER-ENGINEERING",
    subheadline: "Experience the interplay of computational aerodynamics and sculpted carbon.",
    buttonText: "EXPLORE SPECIFICATIONS",
    portfolioUrl: "https://github.com",
    disclaimer: "Fan-made non-commercial portfolio concept. Not affiliated with, endorsed by, or sponsored by Bugatti Automobiles S.A.S. or any automobile manufacturer. 3D model credit: 3D Artist via CGTrader."
  }
};
