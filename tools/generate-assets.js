/**
 * Asset Generator Tool
 * Generates SVG resources for the game
 */

const fs = require('fs');
const path = require('path');

// Color palettes
const COLORS = {
  // Terrain colors
  grass: { fill: '#4a7c4e', stroke: '#2d5a31' },
  plain: { fill: '#d4a574', stroke: '#a67c52' },
  mountain: { fill: '#6b5b4f', stroke: '#4a3f37' },
  forest: { fill: '#2d5016', stroke: '#1a3009' },
  village: { fill: '#8b7355', stroke: '#6b5344' },
  city: { fill: '#7a7a7a', stroke: '#555555' },
  camp: { fill: '#8b4513', stroke: '#654321' },
  river: { fill: '#4a90d9', stroke: '#2e5c8a' },
  
  // Army colors
  cavalry: { fill: '#c41e3a', stroke: '#8b0000' },
  infantry: { fill: '#1e3a8a', stroke: '#0f1f4a' },
  archer: { fill: '#16a34a', stroke: '#0d5c2a' },
  navy: { fill: '#0891b2', stroke: '#05596d' },
  elite: { fill: '#7c3aed', stroke: '#4c1d95' },
  mystic: { fill: '#dc2626', stroke: '#991b1b' },
  
  // UI colors
  ui: {
    primary: '#c9a050',
    secondary: '#8b6914',
    bg: '#1a1a2e',
    panel: '#16213e',
    border: '#e94560'
  }
};

// SVG Templates
const TEMPLATES = {
  terrain: (name, colors, content) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="${name}Pattern" patternUnits="userSpaceOnUse" width="64" height="64">
      <rect width="64" height="64" fill="${colors.fill}"/>
      ${content}
    </pattern>
  </defs>
  <rect width="64" height="64" fill="url(#${name}Pattern)" stroke="${colors.stroke}" stroke-width="1"/>
</svg>`,

  army: (name, colors, icon) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${name}Grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.fill}"/>
      <stop offset="100%" style="stop-color:${colors.stroke}"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3"/>
    </filter>
  </defs>
  <circle cx="24" cy="24" r="20" fill="url(#${name}Grad)" filter="url(#shadow)"/>
  <text x="24" y="28" font-family="Arial" font-size="16" font-weight="bold" 
        text-anchor="middle" fill="white">${icon}</text>
</svg>`,

  uiButton: () => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2a2a4a"/>
      <stop offset="50%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0f0f1a"/>
    </linearGradient>
    <linearGradient id="btnBorder" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#c9a050"/>
      <stop offset="50%" style="stop-color:#8b6914"/>
      <stop offset="100%" style="stop-color:#c9a050"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="196" height="56" rx="8" fill="url(#btnGrad)" 
        stroke="url(#btnBorder)" stroke-width="3"/>
  <rect x="10" y="10" width="180" height="40" rx="4" fill="none" 
        stroke="#c9a050" stroke-width="1" opacity="0.3"/>
</svg>`,

  uiPanel: () => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="300" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0f0f1a"/>
    </linearGradient>
    <linearGradient id="panelBorder" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#8b6914"/>
      <stop offset="50%" style="stop-color:#c9a050"/>
      <stop offset="100%" style="stop-color:#8b6914"/>
    </linearGradient>
    <pattern id="cornerPattern" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M0 10 L10 0 M10 20 L20 10" stroke="#c9a050" stroke-width="1" opacity="0.3"/>
    </pattern>
  </defs>
  <rect width="400" height="300" fill="url(#panelGrad)" 
        stroke="url(#panelBorder)" stroke-width="4"/>
  <rect x="10" y="10" width="380" height="280" fill="url(#cornerPattern)" opacity="0.5"/>
  <path d="M20 20 L40 20 L40 40" fill="none" stroke="#c9a050" stroke-width="2"/>
  <path d="M360 20 L380 20 L380 40" fill="none" stroke="#c9a050" stroke-width="2"/>
  <path d="M20 260 L40 260 L40 280" fill="none" stroke="#c9a050" stroke-width="2"/>
  <path d="M360 260 L380 260 L380 280" fill="none" stroke="#c9a050" stroke-width="2"/>
</svg>`,

  uiDialog: () => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="200" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dialogGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2a2a4a"/>
      <stop offset="100%" style="stop-color:#1a1a2e"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect x="5" y="5" width="490" height="190" rx="15" fill="url(#dialogGrad)" 
        stroke="#c9a050" stroke-width="3" filter="url(#glow)"/>
  <rect x="15" y="15" width="470" height="170" rx="10" fill="none" 
        stroke="#8b6914" stroke-width="1" stroke-dasharray="5,5"/>
  <rect x="20" y="20" width="460" height="30" fill="#c9a050" opacity="0.2" rx="5"/>
</svg>`,

  portrait: (type, gender) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2a2a4a"/>
      <stop offset="100%" style="stop-color:#1a1a2e"/>
    </linearGradient>
    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#c9a050"/>
      <stop offset="100%" style="stop-color:#8b6914"/>
    </linearGradient>
    <clipPath id="circleClip">
      <circle cx="60" cy="60" r="50"/>
    </clipPath>
  </defs>
  
  <!-- Frame -->
  <circle cx="60" cy="60" r="58" fill="url(#frameGrad)"/>
  <circle cx="60" cy="60" r="54" fill="url(#bgGrad)"/>
  
  <!-- Avatar placeholder -->
  <g clip-path="url(#circleClip)">
    <!-- Body -->
    <ellipse cx="60" cy="130" rx="45" ry="55" fill="#${gender === 'male' ? '4a5568' : 'd4a5a5'}"/>
    <!-- Head -->
    <circle cx="60" cy="55" r="25" fill="#f5d0c5"/>
    <!-- Hair -->
    <path d="M35 45 Q60 20 85 45 Q85 35 60 25 Q35 35 35 45" fill="#2d2d2d"/>
    ${gender === 'male' ? 
      '<path d="M45 70 L60 85 L75 70" fill="none" stroke="#2d2d2d" stroke-width="2"/>' :
      '<circle cx="50" cy="55" r="3" fill="#2d2d2d"/><circle cx="70" cy="55" r="3" fill="#2d2d2d"/>'}
  </g>
  
  <!-- Decorative elements -->
  <circle cx="60" cy="60" r="50" fill="none" stroke="#c9a050" stroke-width="2"/>
</svg>`,

  mapBackground: () => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="50%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#334155"/>
    </linearGradient>
    <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="#c9a050" stroke-width="0.5" opacity="0.15"/>
    </pattern>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#skyGrad)"/>
  <rect width="1920" height="1080" fill="url(#gridPattern)"/>
  
  <!-- Decorative elements -->
  <circle cx="200" cy="200" r="150" fill="none" stroke="#c9a050" stroke-width="1" opacity="0.1"/>
  <circle cx="1700" cy="800" r="200" fill="none" stroke="#c9a050" stroke-width="1" opacity="0.1"/>
  <circle cx="960" cy="540" r="300" fill="none" stroke="#c9a050" stroke-width="1" opacity="0.05"/>
  
  <!-- Corner decorations -->
  <g opacity="0.3">
    <path d="M50 50 L150 50 L150 70 L70 70 L70 150 L50 150 Z" fill="#c9a050"/>
    <path d="M1870 50 L1770 50 L1770 70 L1850 70 L1850 150 L1870 150 Z" fill="#c9a050"/>
    <path d="M50 1030 L150 1030 L150 1010 L70 1010 L70 930 L50 930 Z" fill="#c9a050"/>
    <path d="M1870 1030 L1770 1030 L1770 1010 L1850 1010 L1850 930 L1870 930 Z" fill="#c9a050"/>
  </g>
  
  <!-- Title area -->
  <rect x="760" y="30" width="400" height="60" rx="5" fill="#1a1a2e" opacity="0.8"/>
  <rect x="765" y="35" width="390" height="50" rx="3" fill="none" stroke="#c9a050" stroke-width="2"/>
</svg>`
};

// Terrain content patterns
const TERRAIN_CONTENTS = {
  grass: `<g opacity="0.3">
    <circle cx="15" cy="20" r="3" fill="#3d6b40"/>
    <circle cx="45" cy="35" r="4" fill="#3d6b40"/>
    <circle cx="55" cy="50" r="3" fill="#3d6b40"/>
    <path d="M10 55 Q20 45 30 55" fill="none" stroke="#3d6b40" stroke-width="1"/>
  </g>`,
  
  plain: `<g opacity="0.3">
    <path d="M0 45 Q32 35 64 45" fill="none" stroke="#8b6914" stroke-width="2"/>
    <path d="M0 50 Q32 40 64 50" fill="none" stroke="#8b6914" stroke-width="1"/>
    <circle cx="20" cy="15" r="2" fill="#c9a050"/>
    <circle cx="50" cy="25" r="1.5" fill="#c9a050"/>
  </g>`,
  
  mountain: `<g opacity="0.4">
    <path d="M5 55 L20 25 L35 55" fill="none" stroke="#3d342f" stroke-width="2"/>
    <path d="M30 55 L45 20 L60 55" fill="none" stroke="#3d342f" stroke-width="2"/>
    <path d="M15 30 L25 30" fill="none" stroke="#5c4d42" stroke-width="1"/>
    <path d="M40 25 L50 25" fill="none" stroke="#5c4d42" stroke-width="1"/>
  </g>`,
  
  forest: `<g opacity="0.4">
    <path d="M10 50 L10 35 L5 35 L10 25 L15 35 L10 35" fill="#1a3009"/>
    <path d="M30 55 L30 40 L25 40 L30 30 L35 40 L30 40" fill="#1a3009"/>
    <path d="M50 48 L50 33 L45 33 L50 23 L55 33 L50 33" fill="#1a3009"/>
    <circle cx="20" cy="50" r="5" fill="#0d2805"/>
    <circle cx="45" cy="52" r="4" fill="#0d2805"/>
  </g>`,
  
  village: `<g opacity="0.5">
    <rect x="15" y="40" width="12" height="12" fill="#5c4033"/>
    <path d="M12 40 L21 32 L30 40" fill="#8b4513"/>
    <rect x="40" y="35" width="10" height="15" fill="#5c4033"/>
    <path d="M38 35 L45 28 L52 35" fill="#8b4513"/>
    <rect x="25" y="50" width="8" height="8" fill="#5c4033"/>
    <circle cx="50" cy="20" r="2" fill="#c9a050" opacity="0.5"/>
  </g>`,
  
  city: `<g opacity="0.5">
    <rect x="10" y="35" width="15" height="20" fill="#4a4a4a"/>
    <rect x="30" y="30" width="12" height="25" fill="#5a5a5a"/>
    <rect x="45" y="38" width="10" height="17" fill="#4a4a4a"/>
    <rect x="14" y="38" width="4" height="6" fill="#2a2a2a"/>
    <rect x="34" y="35" width="3" height="5" fill="#2a2a2a"/>
    <path d="M8 55 L56 55" stroke="#3a3a3a" stroke-width="2"/>
  </g>`,
  
  camp: `<g opacity="0.5">
    <path d="M15 55 L15 30 L32 20 L49 30 L49 55" fill="none" stroke="#5c4033" stroke-width="2"/>
    <line x1="32" y1="20" x2="32" y2="55" stroke="#5c4033" stroke-width="1"/>
    <rect x="22" y="40" width="20" height="15" fill="#6b4423"/>
    <circle cx="32" cy="15" r="3" fill="#c9a050" opacity="0.5"/>
  </g>`,
  
  river: `<g opacity="0.4">
    <path d="M0 20 Q16 15 32 20 T64 20" fill="none" stroke="#87ceeb" stroke-width="3"/>
    <path d="M0 35 Q16 30 32 35 T64 35" fill="none" stroke="#87ceeb" stroke-width="2"/>
    <path d="M0 50 Q16 45 32 50 T64 50" fill="none" stroke="#87ceeb" stroke-width="3"/>
    <circle cx="20" cy="25" r="1.5" fill="white" opacity="0.3"/>
    <circle cx="45" cy="40" r="1" fill="white" opacity="0.3"/>
  </g>`
};

// Generate terrain SVGs
function generateTerrainAssets() {
  console.log('Generating terrain assets...');
  const terrainDir = path.join(__dirname, '..', 'src', 'assets', 'images', 'terrain');
  
  const terrains = [
    { name: 'grass', colors: COLORS.grass },
    { name: 'plain', colors: COLORS.plain },
    { name: 'mountain', colors: COLORS.mountain },
    { name: 'forest', colors: COLORS.forest },
    { name: 'village', colors: COLORS.village },
    { name: 'city', colors: COLORS.city },
    { name: 'camp', colors: COLORS.camp },
    { name: 'river', colors: COLORS.river }
  ];
  
  terrains.forEach(terrain => {
    const content = TERRAIN_CONTENTS[terrain.name] || '';
    const svg = TEMPLATES.terrain(terrain.name, terrain.colors, content);
    fs.writeFileSync(path.join(terrainDir, `${terrain.name}.svg`), svg);
    console.log(`  ✓ Created ${terrain.name}.svg`);
  });
}

// Generate army SVGs
function generateArmyAssets() {
  console.log('Generating army assets...');
  const armyDir = path.join(__dirname, '..', 'src', 'assets', 'images', 'army');
  
  const armies = [
    { name: 'cavalry', colors: COLORS.cavalry, icon: '骑' },
    { name: 'infantry', colors: COLORS.infantry, icon: '步' },
    { name: 'archer', colors: COLORS.archer, icon: '弓' },
    { name: 'navy', colors: COLORS.navy, icon: '水' },
    { name: 'elite', colors: COLORS.elite, icon: '精' },
    { name: 'mystic', colors: COLORS.mystic, icon: '玄' }
  ];
  
  armies.forEach(army => {
    const svg = TEMPLATES.army(army.name, army.colors, army.icon);
    fs.writeFileSync(path.join(armyDir, `${army.name}.svg`), svg);
    console.log(`  ✓ Created ${army.name}.svg`);
  });
}

// Generate UI assets
function generateUIAssets() {
  console.log('Generating UI assets...');
  const uiDir = path.join(__dirname, '..', 'src', 'assets', 'images', 'ui');
  
  // Button background
  fs.writeFileSync(path.join(uiDir, 'button_bg.svg'), TEMPLATES.uiButton());
  console.log('  ✓ Created button_bg.svg');
  
  // Panel background
  fs.writeFileSync(path.join(uiDir, 'panel_bg.svg'), TEMPLATES.uiPanel());
  console.log('  ✓ Created panel_bg.svg');
  
  // Dialog background
  fs.writeFileSync(path.join(uiDir, 'dialog_bg.svg'), TEMPLATES.uiDialog());
  console.log('  ✓ Created dialog_bg.svg');
}

// Generate portrait assets
function generatePortraitAssets() {
  console.log('Generating portrait assets...');
  const portraitDir = path.join(__dirname, '..', 'src', 'assets', 'images', 'portraits');
  
  // Generic portraits
  fs.writeFileSync(
    path.join(portraitDir, 'generic_male.svg'), 
    TEMPLATES.portrait('male', 'male')
  );
  console.log('  ✓ Created generic_male.svg');
  
  fs.writeFileSync(
    path.join(portraitDir, 'generic_female.svg'), 
    TEMPLATES.portrait('female', 'female')
  );
  console.log('  ✓ Created generic_female.svg');
  
  // King portraits (placeholder variations)
  const kingsDir = path.join(portraitDir, 'kings');
  const kings = ['liu_bei', 'cao_cao', 'sun_quan', 'dong_zhuo', 'yuan_shao'];
  kings.forEach((king, index) => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="kingGrad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#${['c9a050', 'd4af37', 'b8860b', 'cd853f', 'daa520'][index]}"/>
      <stop offset="100%" style="stop-color:#8b6914"/>
    </linearGradient>
    <clipPath id="kingClip${index}">
      <circle cx="60" cy="60" r="50"/>
    </clipPath>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#kingGrad${index})"/>
  <circle cx="60" cy="60" r="54" fill="#1a1a2e"/>
  <g clip-path="url(#kingClip${index})">
    <ellipse cx="60" cy="130" rx="45" ry="55" fill="#4a5568"/>
    <circle cx="60" cy="55" r="25" fill="#f5d0c5"/>
    <path d="M35 45 Q60 20 85 45 Q85 35 60 25 Q35 35 35 45" fill="#${['2d2d2d', '4a3728', '1a1a2e', '2d2d2d', '4a3728'][index]}"/>
    <circle cx="50" cy="55" r="3" fill="#2d2d2d"/>
    <circle cx="70" cy="55" r="3" fill="#2d2d2d"/>
    <path d="M50 70 Q60 75 70 70" fill="none" stroke="#2d2d2d" stroke-width="1"/>
  </g>
  <circle cx="60" cy="60" r="50" fill="none" stroke="#c9a050" stroke-width="3"/>
</svg>`;
    fs.writeFileSync(path.join(kingsDir, `${king}.svg`), svg);
    console.log(`  ✓ Created kings/${king}.svg`);
  });
}

// Generate map background
function generateMapBackground() {
  console.log('Generating map background...');
  const assetsDir = path.join(__dirname, '..', 'src', 'assets', 'images');
  
  fs.writeFileSync(path.join(assetsDir, 'map_bg.svg'), TEMPLATES.mapBackground());
  console.log('  ✓ Created map_bg.svg');
}

// Main execution
function main() {
  console.log('='.repeat(50));
  console.log('Asset Generator for 三国霸业-重置版');
  console.log('='.repeat(50));
  console.log();
  
  try {
    generateTerrainAssets();
    console.log();
    
    generateArmyAssets();
    console.log();
    
    generateUIAssets();
    console.log();
    
    generatePortraitAssets();
    console.log();
    
    generateMapBackground();
    console.log();
    
    console.log('='.repeat(50));
    console.log('✅ All assets generated successfully!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ Error generating assets:', error);
    process.exit(1);
  }
}

main();
