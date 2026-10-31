import fs from 'node:fs';
import zlib from 'node:zlib';

function createSolidPNG(width, height, r, g, b) {
  // Simple PNG creator in pure Node
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const chunkType = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    
    // Calculate CRC32
    let c = 0xffffffff;
    const buf = Buffer.concat([chunkType, data]);
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, chunkType, data, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(2, 9); // Color type: Truecolor (RGB)
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Draw a subtle border and centered emblem color
      const isCenter = Math.abs(x - width/2) < width/3 && Math.abs(y - height/2) < height/3;
      rawData[pxOffset] = isCenter ? 56 : r;     // R
      rawData[pxOffset + 1] = isCenter ? 189 : g; // G
      rawData[pxOffset + 2] = isCenter ? 248 : b; // B
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const p192 = createSolidPNG(192, 192, 15, 23, 42);
const p512 = createSolidPNG(512, 512, 15, 23, 42);

fs.writeFileSync('public/pwa-192x192.png', p192);
fs.writeFileSync('public/pwa-512x512.png', p512);
fs.writeFileSync('public/pwa-maskable-512x512.png', p512);
fs.writeFileSync('public/apple-touch-icon.png', p192);
console.log('PNG icons created successfully.');
