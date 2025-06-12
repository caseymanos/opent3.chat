// Simple script to create placeholder PWA icons
const fs = require('fs');
const path = require('path');

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG template for T3 Crusher icon
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.3}px" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">T3</text>
  <text x="50%" y="70%" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.15}px" fill="white" text-anchor="middle" dominant-baseline="middle">CRUSHER</text>
</svg>
`;

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate SVG icons (as placeholders for now)
sizes.forEach(size => {
  const svg = createSvg(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`✅ Generated ${filename}`);
});

// Create shortcut icons
const shortcuts = ['new-chat', 'upload'];
shortcuts.forEach(shortcut => {
  const svg = createSvg(96);
  const filename = path.join(iconsDir, `shortcut-${shortcut}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`✅ Generated ${filename}`);
});

// Create a simple HTML file to convert SVGs to PNGs
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Icon Generator</title>
  <style>
    body { font-family: system-ui; padding: 20px; }
    .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    .icon-item { text-align: center; border: 1px solid #ccc; padding: 20px; border-radius: 8px; }
    .icon-item img { max-width: 100%; height: auto; }
    .download-btn { margin-top: 10px; padding: 5px 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>T3 Crusher PWA Icons</h1>
  <p>Right-click and save each icon as PNG:</p>
  <div class="icon-grid">
    ${sizes.map(size => `
      <div class="icon-item">
        <img src="/icons/icon-${size}x${size}.svg" width="${size}" height="${size}">
        <p>${size}x${size}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(iconsDir, 'preview.html'), html);

console.log('\n✅ Icon generation complete!');
console.log('📌 Note: These are SVG placeholders. For production:');
console.log('   1. Convert to PNG format using a graphics tool');
console.log('   2. Or use an online PWA icon generator');
console.log('   3. Replace the .svg extensions with .png in manifest.json');