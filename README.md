# Visual Assets

Original format-ready visual assets for everyone.

## Adding Assets

**Important:** All assets must be placed inside the `assets/` directory only.

### Directory Structure

Place your assets in the appropriate subdirectory:

- **Icons**: `assets/icons/` - Small icon files (typically SVG)
- **Logos**: `assets/logos/` - Logo files (typically SVG)
- **Images**: `assets/images/` - Image files (PNG, JPG, WebP, etc.)
- **Videos**: `assets/videos/` - Video files (MP4, WebM, MOV, AVI, MKV, etc.)

### Supported File Formats

The following formats are supported:

- **SVG** (recommended for icons and logos) - Vector format, scalable without quality loss
- **PNG** - Raster format with transparency support
- **JPG/JPEG** - Raster format, smaller file size, no transparency
- **WebP** - Modern raster format with excellent compression
- **MP4** (recommended for videos) - Widely supported video format
- **WebM** - Open video format with good compression
- **MOV, AVI, MKV** - Other supported video formats

### Format Conversion

All assets can be converted between supported formats directly in the browser using the asset gallery interface. The conversion is performed client-side using the browser's Canvas API.

**Conversion Matrix:**

| From → To | PNG | JPG | WebP | SVG |
|-----------|-----|-----|------|-----|
| **SVG** | ✅ | ✅ | ✅ | ✅ (original) |
| **PNG** | ✅ (original) | ✅ | ✅ | ⚠️ (embedded) |
| **JPG** | ✅ | ✅ (original) | ✅ | ⚠️ (embedded) |
| **WebP** | ✅ | ✅ | ✅ (original) | ⚠️ (embedded) |

**Notes:**

- ✅ **Full conversion** - Maintains quality and dimensions
- ⚠️ **Embedded conversion** - Raster images embedded in SVG (not true vector conversion)
- SVG to raster conversions maintain quality at the original size
- Raster to raster conversions preserve image dimensions
- Use the copy/download buttons in the asset gallery to access different formats
- Conversions are performed on-demand in your browser (no server processing)

### Example

To add a new icon:

1. Place your file in `assets/icons/your-icon-name.svg`
2. Commit and push to the repository
3. The system will automatically update `assets.json` (see below)

## Automatic Asset Registration

**`assets.json` is updated programmatically** - you should not edit it manually.

When you add, modify, or remove files in the `assets/` directory:

1. A GitHub Action workflow automatically scans the filesystem
2. Extracts metadata (name, type, tags, size) from your files
3. Generates or updates `assets.json` automatically
4. Commits the changes back to the repository

The system automatically:

- Extracts tags from filenames (e.g., `aws-black-orange-icon.svg` → tags: `["aws", "black", "orange", "icon"]`)
- Determines asset type from directory (`icons/` → `icon`, `logos/` → `logo`)
- Extracts size information from SVG files (viewBox or width/height attributes)
- Generates descriptions based on filename and metadata

## Direct Asset URLs

Assets are automatically made available at shorter, direct URLs:

- Icons: `https://assets.awsug.nz/icons/filename.svg`
- Logos: `https://assets.awsug.nz/logos/filename.svg`
- Images: `https://assets.awsug.nz/images/filename.png`
- Videos: `https://assets.awsug.nz/videos/filename.mp4`

For example:

- `assets/icons/aws-black-orange.svg` → `https://assets.awsug.nz/icons/aws-black-orange.svg`
- `assets/logos/datacom-primary-blue.svg` → `https://assets.awsug.nz/logos/datacom-primary-blue.svg`
- `assets/videos/awscd-ocenia-cfp-2026.mp4` → `https://assets.awsug.nz/videos/awscd-ocenia-cfp-2026.mp4`

**Full URL format:** All assets can be accessed using the full URL path:

- `https://assets.awsug.nz/icons/aws-black-orange.svg`
- `https://assets.awsug.nz/logos/datacom-primary-blue.svg`
- `https://assets.awsug.nz/images/your-image.png`
- `https://assets.awsug.nz/videos/your-video.mp4`

These URLs are created automatically during deployment - no manual configuration needed.

## Usage

### Direct Image Links

You can link directly to any asset using its direct URL:

**Icons:**

- `https://assets.awsug.nz/icons/aws-black-orange.svg`
- `https://assets.awsug.nz/icons/aws-blue-orange.svg`

**Logos:**

- `https://assets.awsug.nz/logos/aws-black-orange-sphere.svg`
- `https://assets.awsug.nz/logos/datacom-primary-blue.svg`

**Images:**

- `https://assets.awsug.nz/images/your-image.png`

**Videos:**

- `https://assets.awsug.nz/videos/your-video.mp4`

### In HTML

Embed an image directly:

```html
<img src="https://assets.awsug.nz/icons/aws-black-orange.svg" alt="AWS Icon">
```

Link to an image (opens in new tab):

```html
<a href="https://assets.awsug.nz/icons/aws-black-orange.svg" target="_blank">
  View AWS Icon
</a>
```

Embed a video:

```html
<video src="https://assets.awsug.nz/videos/your-video.mp4" controls>
  Your browser does not support the video tag.
</video>
```

### In Markdown

Display an image:

```markdown
![AWS Icon](https://assets.awsug.nz/icons/aws-black-orange.svg)
```

Link to an image:

```markdown
[View AWS Icon](https://assets.awsug.nz/icons/aws-black-orange.svg)
```

### In CSS

Use as background image:

```css
background-image: url('https://assets.awsug.nz/logos/datacom-primary-blue.svg');
```

### In React/JSX

```jsx
<img src="https://assets.awsug.nz/icons/aws-black-orange.svg" alt="AWS Icon" />

<video src="https://assets.awsug.nz/videos/your-video.mp4" controls>
  Your browser does not support the video tag.
</video>
```

### Download Links

You can also use these URLs as download links:

```html
<a href="https://assets.awsug.nz/icons/aws-black-orange.svg" download>
  Download AWS Icon
</a>
```

## License

Use responsibly and according to their respective licenses.
