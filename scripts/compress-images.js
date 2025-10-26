const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const OUTPUT_DIR = path.join(__dirname, '../public/compressed');

// 압축할 이미지 목록
const images = [
  'toor.png',
  'water.png',
  'portfolio.png',
  'star.png',
  'runcat.png',
  'preview.png',
  'load2.png',
  'kitagawa.jpeg'
];

// 출력 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function compressImage(filename) {
  const inputPath = path.join(PUBLIC_DIR, filename);
  const ext = path.extname(filename);
  const basename = path.basename(filename, ext);

  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  ${filename} not found, skipping...`);
    return;
  }

  try {
    const inputStats = fs.statSync(inputPath);
    const inputSize = inputStats.size;

    // WebP로 변환 (80% 품질)
    const webpPath = path.join(OUTPUT_DIR, `${basename}.webp`);
    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(webpPath);

    // AVIF로 변환 (75% 품질, 더 작음)
    const avifPath = path.join(OUTPUT_DIR, `${basename}.avif`);
    await sharp(inputPath)
      .avif({ quality: 75 })
      .toFile(avifPath);

    // 최적화된 원본 포맷 (85% 품질)
    const optimizedPath = path.join(PUBLIC_DIR, filename);
    if (ext === '.png') {
      await sharp(inputPath)
        .png({ quality: 85, compressionLevel: 9 })
        .toFile(optimizedPath + '.tmp');
    } else if (ext === '.jpeg' || ext === '.jpg') {
      await sharp(inputPath)
        .jpeg({ quality: 85, progressive: true })
        .toFile(optimizedPath + '.tmp');
    }

    // 임시 파일을 원본으로 교체
    if (fs.existsSync(optimizedPath + '.tmp')) {
      fs.renameSync(optimizedPath + '.tmp', optimizedPath);
    }

    const outputStats = fs.statSync(optimizedPath);
    const outputSize = outputStats.size;
    const reduction = ((inputSize - outputSize) / inputSize * 100).toFixed(1);

    console.log(`✅ ${filename}: ${(inputSize / 1024).toFixed(0)} KB → ${(outputSize / 1024).toFixed(0)} KB (${reduction}% 감소)`);

    const webpSize = fs.statSync(webpPath).size;
    const avifSize = fs.statSync(avifPath).size;
    console.log(`   WebP: ${(webpSize / 1024).toFixed(0)} KB, AVIF: ${(avifSize / 1024).toFixed(0)} KB`);

  } catch (error) {
    console.error(`❌ Error compressing ${filename}:`, error.message);
  }
}

async function compressAll() {
  console.log('🚀 Starting image compression...\n');

  for (const image of images) {
    await compressImage(image);
  }

  console.log('\n✨ Compression complete!');
  console.log(`📁 WebP/AVIF versions saved to: ${OUTPUT_DIR}`);
}

compressAll();
