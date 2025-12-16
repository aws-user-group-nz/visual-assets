#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read existing assets.json to preserve custom descriptions
let existingAssets = {};
try {
  const existing = JSON.parse(fs.readFileSync('assets.json', 'utf8'));
  existing.assets.forEach(asset => {
    existingAssets[asset.path] = asset;
  });
} catch (e) {
  // File doesn't exist or is invalid, start fresh
}

const assets = [];

function extractSizeFromSvg(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Try to extract from width/height attributes first (preferred for display size)
    const widthMatch = content.match(/width=["'](\d+)["']/);
    const heightMatch = content.match(/height=["'](\d+)["']/);
    if (widthMatch && heightMatch) {
      const width = parseInt(widthMatch[1]);
      const height = parseInt(heightMatch[1]);
      // Return the larger dimension, or width if square
      return width === height ? width : Math.max(width, height);
    }
    // Fallback to viewBox
    const viewBoxMatch = content.match(/viewBox=["']\d+\s+\d+\s+(\d+)\s+(\d+)["']/);
    if (viewBoxMatch) {
      const width = parseInt(viewBoxMatch[1]);
      const height = parseInt(viewBoxMatch[2]);
      return width === height ? width : Math.max(width, height);
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

function generateName(filename, type) {
  // Remove extension
  const base = filename.replace(/\.[^/.]+$/, '');
  // Convert to kebab-case and add type suffix (singular)
  const typeSingular = type.slice(0, -1); // Remove 's' from icons/logos/images
  return `${base}-${typeSingular}`;
}

function extractTags(filename, type, directory) {
  const tags = new Set();

  // Add type as tag (singular)
  const typeSingular = type.slice(0, -1); // Remove 's' from icons/logos/images
  tags.add(typeSingular);

  // Extract tags from filename (split by dashes)
  const parts = filename.replace(/\.[^/.]+$/, '').split('-');
  parts.forEach(part => {
    if (part && part.length > 0) {
      tags.add(part.toLowerCase());
    }
  });

  // Add directory-specific tags
  if (filename.includes('oceania')) {
    tags.add('oceania');
  }

  return Array.from(tags).sort();
}

function generateDescription(name, type, size, filename) {
  const typeSingular = type.slice(0, -1);
  const existing = existingAssets[`assets/${type}/${filename}`];
  if (existing && existing.description) {
    return existing.description;
  }

  // Generate basic description - capitalize first letter and format nicely
  const sizeStr = size ? ` (${size}×${size})` : '';
  const displayName = name.replace(`-${typeSingular}`, '').split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  return `${displayName} ${typeSingular} asset${sizeStr}`;
}

// Scan assets directory
const assetsDir = path.join(__dirname, '..', 'assets');

['icons', 'logos', 'images'].forEach(type => {
  const typeDir = path.join(assetsDir, type);
  if (!fs.existsSync(typeDir)) {
    return;
  }

  const files = fs.readdirSync(typeDir);
  files.forEach(file => {
    const filePath = path.join(typeDir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.svg' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
        const relativePath = `assets/${type}/${file}`;
        const name = generateName(file, type);
        const size = ext === '.svg' ? extractSizeFromSvg(filePath) : null;
        const tags = extractTags(file, type, file);
        const description = generateDescription(name, type, size, file);

        // Use singular type for the asset
        const typeSingular = type.slice(0, -1);

        const asset = {
          name,
          type: typeSingular,
          path: relativePath,
          tags
        };

        if (size) {
          asset.size = size;
        }

        asset.description = description;

        assets.push(asset);
      }
    }
  });
});

// Sort assets by name
assets.sort((a, b) => a.name.localeCompare(b.name));

const output = {
  assets
};

fs.writeFileSync('assets.json', JSON.stringify(output, null, 2) + '\n');
console.log(`Generated assets.json with ${assets.length} assets`);
