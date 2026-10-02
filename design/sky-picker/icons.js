// Icon sets for the "Set the sky" panel. Each returns inline SVG markup.
window.ICONS = {
  // Current icons, as in A-Sky-Mobile (40 grid).
  cur: {
    sun: '<svg width="38" height="38" viewBox="0 0 40 40"><path d="M20 4v4M20 32v4M4 20h4M32 20h4M8.7 8.7l2.8 2.8M28.5 28.5l2.8 2.8M8.7 31.3l2.8-2.8M28.5 11.5l2.8-2.8" stroke="#FFD66B" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="20" r="8" fill="#FFC940"/></svg>',
    cloud: '<svg width="38" height="38" viewBox="0 0 40 40"><path d="M12 29h16.5a6.5 6.5 0 0 0 .8-12.95A9 9 0 0 0 12 15a7 7 0 0 0 0 14z" fill="#FFFFFF"/></svg>',
    rain: '<svg width="38" height="38" viewBox="0 0 40 40"><path d="M12 24h16.5a6.5 6.5 0 0 0 .8-12.95A9 9 0 0 0 12 10a7 7 0 0 0 0 14z" fill="#C9D6F7"/><path d="M14 28l-1.6 4.5M20.5 28l-1.6 4.5M27 28l-1.6 4.5" stroke="#8FB3FF" stroke-width="2.2" stroke-linecap="round"/></svg>',
    hot: '<svg width="38" height="38" viewBox="0 0 40 40"><circle cx="20" cy="16" r="8.5" fill="#FFE3A1"/><path d="M6 27c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0 4.3-1.6 6.5 0 4.3 1.6 6.5 0M9 33c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0 4.3-1.6 6.5 0" fill="none" stroke="#FFE3A1" stroke-width="2" stroke-linecap="round"/></svg>'
  },
  // V1 "Duotone": one 32 grid, same optical size, a light and a dark tone per glyph.
  duo: {
    sun: '<svg width="34" height="34" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#FFC940" opacity=".28"/><circle cx="16" cy="16" r="6.2" fill="#FFC940"/><path d="M16 3.5v2.6M16 25.9v2.6M3.5 16h2.6M25.9 16h2.6M7.2 7.2l1.8 1.8M23 23l1.8 1.8M7.2 24.8L9 23M23 9l1.8-1.8" stroke="#FFE08A" stroke-width="2" stroke-linecap="round"/></svg>',
    cloud: '<svg width="34" height="34" viewBox="0 0 32 32"><path d="M21.5 11.2a5.2 5.2 0 0 1 4.6 7.6H12.6a4.3 4.3 0 0 1 .9-8.5 6.2 6.2 0 0 1 8-.9z" fill="#FFFFFF" opacity=".55"/><path d="M10 26h12.2a4.8 4.8 0 0 0 .6-9.56A6.7 6.7 0 0 0 10 15.6 5.2 5.2 0 0 0 10 26z" fill="#FFFFFF"/></svg>',
    rain: '<svg width="34" height="34" viewBox="0 0 32 32"><path d="M10 19h12.2a4.8 4.8 0 0 0 .6-9.56A6.7 6.7 0 0 0 10 8.6 5.2 5.2 0 0 0 10 19z" fill="#DCE6FF"/><path d="M11.5 22.5l-1.2 3.2M16.5 22.5l-1.2 3.2M21.5 22.5l-1.2 3.2" stroke="#9CBBFF" stroke-width="2" stroke-linecap="round"/></svg>',
    hot: '<svg width="34" height="34" viewBox="0 0 32 32"><circle cx="12" cy="12" r="8" fill="#FFB25C" opacity=".35"/><circle cx="12" cy="12" r="4.8" fill="#FFD27A"/><path d="M12 2.8v1.8M2.8 12h1.8M5.5 5.5l1.3 1.3M18.5 5.5l-1.3 1.3M5.5 18.5l1.3-1.3" stroke="#FFE3A1" stroke-width="1.8" stroke-linecap="round"/><rect x="20" y="9" width="5.4" height="14" rx="2.7" fill="#FFF3DD"/><circle cx="22.7" cy="24" r="4" fill="#FF6A3D"/><rect x="21.6" y="14" width="2.2" height="9" rx="1.1" fill="#FF6A3D"/></svg>'
  },
  // V2 "Line": monoline 1.8px glyphs that take the text colour, like system icons.
  line: {
    sun: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/></svg>',
    cloud: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.4 18.5h9.4a3.9 3.9 0 0 0 .4-7.78 5.4 5.4 0 0 0-10.3 1.15A3.4 3.4 0 0 0 7.4 18.5z"/></svg>',
    rain: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.4 14.5h9.4a3.9 3.9 0 0 0 .4-7.78 5.4 5.4 0 0 0-10.3 1.15A3.4 3.4 0 0 0 7.4 14.5z"/><path d="M8.5 17.5l-1 2.8M12.5 17.5l-1 2.8M16.5 17.5l-1 2.8"/></svg>',
    hot: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 13.9V5a2 2 0 0 0-4 0v8.9a4 4 0 1 0 4 0z"/><path d="M12 9.5v6.5"/><path d="M18 4.5l1.2-1.2M19.5 8h1.7M18 11.5l1.2 1.2"/></svg>'
  },
  // V3 "Scene": small illustrations with glow and depth, sized for tiles.
  scene: {
    sun: '<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="url(#gSun)"/><path d="M24 7v4M24 37v4M7 24h4M37 24h4M12 12l2.8 2.8M33.2 33.2L36 36M12 36l2.8-2.8M33.2 14.8L36 12" stroke="#FFE08A" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="24" r="8.5" fill="#FFD25A"/><circle cx="21.4" cy="21.4" r="3" fill="#FFF2C2" opacity=".7"/></svg>',
    cloud: '<svg width="48" height="48" viewBox="0 0 48 48"><path d="M30 15a7.5 7.5 0 0 1 7 10.4H17.6a6.2 6.2 0 0 1 2.2-12A9 9 0 0 1 30 15z" fill="#FFFFFF" opacity=".5"/><path d="M14 37h19a7 7 0 0 0 .9-13.94A9.8 9.8 0 0 0 15.3 21.6 7.7 7.7 0 0 0 14 37z" fill="#FFFFFF"/><path d="M14 37h19a7 7 0 0 0 4.2-1.4H11.5A7.6 7.6 0 0 0 14 37z" fill="#C7D0DB"/></svg>',
    rain: '<svg width="48" height="48" viewBox="0 0 48 48"><path d="M14 28h19a7 7 0 0 0 .9-13.94A9.8 9.8 0 0 0 15.3 12.6 7.7 7.7 0 0 0 14 28z" fill="#C9D6F7"/><path d="M16 32l-2 6M23 32l-2 6M30 32l-2 6" stroke="#9CBBFF" stroke-width="2.4" stroke-linecap="round"/><path d="M19.5 39.5l-1 2.5M26.5 39.5l-1 2.5" stroke="#9CBBFF" stroke-width="2.4" stroke-linecap="round" opacity=".55"/></svg>',
    hot: '<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="16" r="15" fill="url(#gHot)"/><circle cx="24" cy="16" r="8" fill="#FFE3A1"/><path d="M15 29c-1.6 1.7-1.6 3.3 0 5s1.6 3.3 0 5M24 29c-1.6 1.7-1.6 3.3 0 5s1.6 3.3 0 5M33 29c-1.6 1.7-1.6 3.3 0 5s1.6 3.3 0 5" fill="none" stroke="#FFE3A1" stroke-width="2.4" stroke-linecap="round"/></svg>'
  }
};
