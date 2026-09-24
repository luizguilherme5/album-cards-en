// A synthetic, original fixture for exercising upload/crop without album artwork.
import sharp from 'sharp';
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="1200" height="1200" fill="#e6eb99"/><circle cx="720" cy="500" r="400" fill="#283c32"/><circle cx="720" cy="500" r="260" fill="none" stroke="#e6eb99" stroke-width="2"/><circle cx="720" cy="500" r="180" fill="none" stroke="#e6eb99" stroke-width="2"/><circle cx="720" cy="500" r="12" fill="#e6eb99"/><text x="80" y="1040" font-size="90" fill="#283c32" font-family="serif">First Light</text><text x="85" y="1100" font-size="25" fill="#283c32" font-family="sans-serif">ALBUM CARDS / DEMONSTRATION ARTWORK</text></svg>`,
  ),
)
  .png()
  .toFile('/tmp/album-cards-demo.png');
