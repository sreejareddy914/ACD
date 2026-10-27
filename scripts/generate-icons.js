import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePng(size) {
  const width = size;
  const height = size;
  const rawBytes = [];

  // Theme colors: Navy shield (#0f172a / #2563eb) with bright cyan eye/magnifier (#06b6d4)
  for (let y = 0; y < height; y++) {
    rawBytes.push(0); // Filter byte: None
    for (let x = 0; x < width; x++) {
      const nx = (x / width) * 2 - 1; // -1 to 1
      const ny = (y / height) * 2 - 1; // -1 to 1

      // Shield formula: top curved or flat, tapered bottom
      const shieldTop = -0.75;
      const shieldSide = 0.72;
      const inTopSection = ny >= shieldTop && ny <= 0.1 && Math.abs(nx) <= shieldSide;
      const inBottomSection = ny > 0.1 && ny <= 0.85 && Math.abs(nx) <= (shieldSide * (1 - (ny - 0.1) / 0.75));

      const inShield = inTopSection || inBottomSection;

      // Inner eye/lens circle at center
      const distFromCenter = Math.sqrt(nx * nx + (ny + 0.05) * (ny + 0.05));
      const inPupil = distFromCenter <= 0.22;
      const inIrisRing = distFromCenter > 0.22 && distFromCenter <= 0.38;

      if (inShield) {
        if (inPupil) {
          // Bright cyan pupil
          rawBytes.push(6, 182, 212, 255); // #06b6d4
        } else if (inIrisRing) {
          // White iris accent ring
          rawBytes.push(255, 255, 255, 255);
        } else {
          // Blue-indigo gradient shield background
          const r = Math.floor(37 + (ny + 1) * 10);
          const g = Math.floor(99 + (ny + 1) * 20);
          const b = Math.floor(235 - (ny + 1) * 30);
          rawBytes.push(r, g, b, 255);
        }
      } else {
        // Transparent outside
        rawBytes.push(0, 0, 0, 0);
      }
    }
  }

  const rawBuffer = Buffer.from(rawBytes);
  const compressed = zlib.deflateSync(rawBuffer);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression deflate
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace none

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(process.cwd(), 'public/icons');
fs.mkdirSync(outDir, { recursive: true });

[16, 32, 48, 128].forEach(size => {
  const buf = generatePng(size);
  const p = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(p, buf);
  console.log(`Generated icon: ${p} (${buf.length} bytes)`);
});
