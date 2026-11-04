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

  // Default Configurations
  DEFAULT_COLOR_KEY: "deep_rosso",
  DEFAULT_FINISH_KEY: "gloss",
  DEFAULT_WHEEL_KEY: "magnesium",
  DEFAULT_CALIPER_KEY: "racing_red",
  DEFAULT_INTERIOR_KEY: "pur_sport_alcantara",

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
    },
    iridescent_pearl: {
      name: "Iridescent Pearl",
      hex: "#e8e0f0",
      metalness: 0.92,
      roughness: 0.13,
      clearcoat: 1.0,
      clearcoatRoughness: 0.10,
      accentHex: "#c084fc",
      pearlescent: true
    }
  },

  // Wheel Finishes
  WHEEL_PRESETS: {
    magnesium: {
      name: "Forged Magnesium",
      hex: "#18181c",
      metalness: 0.95,
      roughness: 0.18
    },
    stealth_black: {
      name: "Stealth Noir",
      hex: "#09090b",
      metalness: 0.80,
      roughness: 0.35
    },
    hyper_silver: {
      name: "Hyper Silver",
      hex: "#e2e8f0",
      metalness: 0.98,
      roughness: 0.12
    },
    tuscan_gold: {
      name: "Tuscan Bronze",
      hex: "#d4af37",
      metalness: 0.92,
      roughness: 0.22
    }
  },

  // Brake Caliper Colors
  CALIPER_PRESETS: {
    racing_red: {
      name: "French Racing Red",
      hex: "#dc2626",
      metalness: 0.88,
      roughness: 0.14
    },
    speed_yellow: {
      name: "Vibrant Yellow",
      hex: "#eab308",
      metalness: 0.86,
      roughness: 0.15
    },
    acid_green: {
      name: "Acid Green",
      hex: "#84cc16",
      metalness: 0.85,
      roughness: 0.16
    },
    stealth_black: {
      name: "Stealth Noir",
      hex: "#18181b",
      metalness: 0.90,
      roughness: 0.22
    }
  },

  // Interior Upholstery
  INTERIOR_PRESETS: {
    pur_sport_alcantara: {
      name: "Pur Sport Alcantara",
      hex: "#151517",
      roughness: 0.96,
      metalness: 0.02
    },
    beluga_noir: {
      name: "Beluga Noir Nappa",
      hex: "#0a0a0c",
      roughness: 0.65,
      metalness: 0.08
    },
    cognac_tan: {
      name: "Cognac Saddle Leather",
      hex: "#78350f",
      roughness: 0.68,
      metalness: 0.06
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

/**
 * Cinematic Launch Film Chapter Manifest (Phase 2 Choreography)
 * Each chapter has: ONE named camera move, ONE lighting mood, and ONE line of copy.
 */
export const CHAPTER_COPY = [
  {
    index: 0,
    number: "01",
    total: "06",
    title: "THE REVEAL",
    line: "Not built to be seen. Built to be felt.",
    move: "Push-in (Ground level)",
    lighting: "Silhouette Strip Sweep"
  },
  {
    index: 1,
    number: "02",
    total: "06",
    title: "THE ORBIT",
    line: "Walk the room.",
    move: "270° Flank Arc",
    lighting: "Studio Rim & Rack Focus",
    annotations: [
      { id: "fins", label: "Rear", text: "The fins.", anchor: [0.0, 0.95, -2.15], progressRange: [0.12, 0.165] },
      { id: "line", label: "Side", text: "The single line.", anchor: [-1.02, 0.65, 0.1], progressRange: [0.165, 0.21] },
      { id: "grille", label: "Front", text: "The grille.", anchor: [0.0, 0.38, 2.35], progressRange: [0.21, 0.255] },
      { id: "spine", label: "Top", text: "The spine.", anchor: [0.0, 1.15, -0.2], progressRange: [0.255, 0.30] }
    ]
  },
  {
    index: 2,
    number: "03",
    total: "06",
    title: "THE DOLLY ZOOM",
    line: "Now look inside.",
    move: "Hitchcock Dolly Zoom (FOV 25° → 60°)",
    lighting: "Dark Void / Emphasis Cut"
  },
  {
    index: 3,
    number: "04",
    total: "06",
    title: "THE TEARDOWN",
    line: "Layer by layer.",
    move: "Vertical Crane & Subsystem Snap",
    lighting: "High-Contrast Technical Studio",
    specimens: {
      body_panels: {
        layer: "LAYER 01",
        name: "Aerodynamic Shell & Monocoque",
        story: "Active downforce surface sculpted from raw carbon composite.",
        heroValue: "1.9 M²", // PLACEHOLDER
        heroLabel: "Surface Area",
        anchor: [0.0, 0.95, 0.4]
      },
      glass_and_lights: {
        layer: "LAYER 02",
        name: "Optical Array & Aero Glazing",
        story: "Lightweight polycarbonate with integrated cooling ducts.",
        heroValue: "9,600 LM", // PLACEHOLDER
        heroLabel: "Matrix Lumens",
        anchor: [0.55, 0.65, 1.6]
      },
      interior: {
        layer: "LAYER 03",
        name: "Pur Sport Cockpit",
        story: "Stripped-back motorsport luxury in laser-cut Alcantara and titanium.",
        heroValue: "Alcantara & Ti", // PLACEHOLDER
        heroLabel: "Motorsport Trim",
        anchor: [0.0, 0.72, 0.05]
      },
      mechanical: {
        layer: "LAYER 04",
        name: "Powertrain & Subframe",
        story: "Four turbos. One decision: more.",
        heroValue: "1,600 NM", // PLACEHOLDER
        heroLabel: "Artistic Architecture Placeholder",
        anchor: [0.0, 0.45, -0.65]
      },
      brakes: {
        layer: "LAYER 05",
        name: "Carbon-Ceramic Braking",
        story: "Titanium 8-piston monobloc deceleration architecture.",
        heroValue: "420 MM", // PLACEHOLDER
        heroLabel: "Front Rotors",
        anchor: [0.72, 0.38, 1.25]
      },
      wheels: {
        layer: "LAYER 06",
        name: "Magnesium Aero Blades",
        story: "Extracting brake heat under extreme lateral load.",
        heroValue: "-16 KG", // PLACEHOLDER
        heroLabel: "Unsprung Mass",
        anchor: [0.78, 0.38, 1.25]
      }
    }
  },
  {
    index: 4,
    number: "05",
    total: "06",
    title: "THE MACRO",
    line: "Details nobody asked for.",
    move: "Probe-Lens Surface Crawl (FOV 12°)",
    lighting: "Clearcoat Highlight Streaks",
    directorNotes: [
      { text: "Every vent here moves air. None of them are decoration.", tag: "DIRECTOR'S NOTE // 01" },
      { text: "Tolerances measured in microns; downforce measured in Gs.", tag: "DIRECTOR'S NOTE // 02" }
    ]
  },
  {
    index: 5,
    number: "06",
    total: "06",
    title: "THE FINALE",
    line: "Make it yours.",
    move: "Slow Turntable Centered",
    lighting: "Showroom Spotlight & Paint Sweep",
    cta: "Reserve a viewing."
  }
];
