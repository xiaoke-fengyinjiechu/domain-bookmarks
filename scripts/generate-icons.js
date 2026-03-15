/**
 * 图标生成脚本
 * 将 SVG 图标转换为不同尺寸的 PNG 格式
 */

const sharp = require('sharp');
const path = require('path');

/**
 * 生成指定尺寸的 PNG 图标
 * @param {number} size 图标尺寸（像素）
 * @param {string} outputName 输出文件名
 */
async function generateIcon(size, outputName) {
  const svgPath = path.join(__dirname, '..', 'icons', 'icon.svg');
  const outputPath = path.join(__dirname, '..', 'icons', outputName);

  try {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated ${outputName} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputName}:`, error.message);
  }
}

/**
 * 主函数：生成所有需要的图标
 */
async function main() {
  console.log('Generating Chrome extension icons...\n');

  // 生成 16x16 图标（工具栏图标）
  await generateIcon(16, 'icon16.png');

  // 生成 48x48 图标（扩展管理页面图标）
  await generateIcon(48, 'icon48.png');

  // 生成 128x128 图标（Chrome 网上应用店图标）
  await generateIcon(128, 'icon128.png');

  console.log('\n✓ All icons generated successfully!');
}

// 执行生成
main().catch(console.error);
