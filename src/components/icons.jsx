// Minimal, dependency-free icon set. Inherits currentColor.
const S = (p) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...p,
});

export const Icon = {
  Plus: (p) => (
    <svg {...S(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Move: (p) => (
    <svg {...S(p)}>
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  ),
  Link: (p) => (
    <svg {...S(p)}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  ),
  Home: (p) => (
    <svg {...S(p)}>
      <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  ),
  Download: (p) => (
    <svg {...S(p)}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  ),
  Upload: (p) => (
    <svg {...S(p)}>
      <path d="M12 21V9M7 14l5-5 5 5" />
      <path d="M5 3h14" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...S(p)}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  ),
  Target: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Close: (p) => (
    <svg {...S(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Sun: (p) => (
    <svg {...S(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </svg>
  ),
  Moon: (p) => (
    <svg {...S(p)}>
      <path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z" />
    </svg>
  ),
  Sound: (p) => (
    <svg {...S(p)}>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M16 9a3 3 0 0 1 0 6" />
    </svg>
  ),
  Sparkle: (p) => (
    <svg {...S(p)}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  ),
};
