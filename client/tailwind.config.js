/** @type {import('tailwindcss').Config} */
// Design language: based on Square "Market" — clean, high-trust, business-facing.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Square Sans"', "Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ['"SF Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        // Square brand blue — also remaps default blue-* so existing usage upgrades automatically
        blue: { 50:"#EBF2FF",100:"#D6E4FF",200:"#ADC8FF",300:"#85ADFF",400:"#3D82FF",500:"#006AFF",600:"#0057D6",700:"#0044A8",800:"#00347F",900:"#002559" },
        brand: { DEFAULT:"#006AFF",50:"#EBF2FF",100:"#D6E4FF",200:"#ADC8FF",300:"#85ADFF",400:"#3D82FF",500:"#006AFF",600:"#0057D6",700:"#0044A8",800:"#00347F",900:"#002559" },
        // Refined cool-neutral scale (replaces stock gray app-wide)
        gray: { 50:"#F6F8FA",100:"#EDF0F3",200:"#DCE1E7",300:"#C2C9D1",400:"#97A1AD",500:"#6B7684",600:"#4E5866",700:"#3A424D",800:"#23292F",900:"#12161A" },
        // Semantic scales — remap default green/emerald/red/amber so status colors harmonize app-wide
        success: { 50:"#E7F6EC",100:"#C6EAD1",200:"#97D9AC",300:"#5FBF7E",400:"#33A65C",500:"#1B873F",600:"#147233",700:"#0F5A28",800:"#0B461F",900:"#073216" },
        green:   { 50:"#E7F6EC",100:"#C6EAD1",200:"#97D9AC",300:"#5FBF7E",400:"#33A65C",500:"#1B873F",600:"#147233",700:"#0F5A28",800:"#0B461F",900:"#073216" },
        emerald: { 50:"#E7F6EC",100:"#C6EAD1",200:"#97D9AC",300:"#5FBF7E",400:"#33A65C",500:"#1B873F",600:"#147233",700:"#0F5A28",800:"#0B461F",900:"#073216" },
        warning: { 50:"#FEF6E7",100:"#FBE7BF",200:"#F6D38C",300:"#EBB94E",400:"#D29A2A",500:"#B7791F",600:"#95610F",700:"#744A0B",800:"#573806",900:"#3B2604" },
        amber:   { 50:"#FEF6E7",100:"#FBE7BF",200:"#F6D38C",300:"#EBB94E",400:"#D29A2A",500:"#B7791F",600:"#95610F",700:"#744A0B",800:"#573806",900:"#3B2604" },
        yellow:  { 50:"#FEF6E7",100:"#FBE7BF",200:"#F6D38C",300:"#EBB94E",400:"#D29A2A",500:"#B7791F",600:"#95610F",700:"#744A0B",800:"#573806",900:"#3B2604" },
        danger:  { 50:"#FCE9ED",100:"#F7C7D1",200:"#EF9CAE",300:"#E56A85",400:"#DE4363",500:"#D4183D",600:"#B01030",700:"#8A0B26",800:"#66081C",900:"#470512" },
        red:     { 50:"#FCE9ED",100:"#F7C7D1",200:"#EF9CAE",300:"#E56A85",400:"#DE4363",500:"#D4183D",600:"#B01030",700:"#8A0B26",800:"#66081C",900:"#470512" },
      },
      borderRadius: { DEFAULT:"6px", md:"8px", lg:"10px", xl:"14px" },
      boxShadow: {
        xs:"0 1px 2px 0 rgba(18,22,26,0.05)",
        sm:"0 1px 3px 0 rgba(18,22,26,0.08), 0 1px 2px -1px rgba(18,22,26,0.06)",
        md:"0 4px 12px -2px rgba(18,22,26,0.10), 0 2px 6px -2px rgba(18,22,26,0.06)",
        card:"0 1px 2px 0 rgba(18,22,26,0.06), 0 0 0 1px rgba(18,22,26,0.04)",
      },
    },
  },
  plugins: [],
};
