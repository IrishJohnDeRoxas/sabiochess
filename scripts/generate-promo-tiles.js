const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Load piece SVGs
const piecesDir = path.join(__dirname, '../public/pieces');
function getPieceSvg(name) {
  const file = path.join(piecesDir, name + '.svg');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/<\?xml.*?\?>/gi, '');
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 45 45';
    const inner = content.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
    return { viewBox, inner };
  }
  return null;
}

const pieces = {
  r: getPieceSvg('bR'),
  n: getPieceSvg('bN'),
  b: getPieceSvg('bB'),
  q: getPieceSvg('bQ'),
  k: getPieceSvg('bK'),
  p: getPieceSvg('bP'),
  R: getPieceSvg('wR'),
  N: getPieceSvg('wN'),
  B: getPieceSvg('wB'),
  Q: getPieceSvg('wQ'),
  K: getPieceSvg('wK'),
  P: getPieceSvg('wP')
};

// Standard Opening / Tactical Board position
const boardLayout = [
  ['r', 'n', 'b', 'q', 'k', '', '', 'r'],
  ['p', 'p', 'p', '', 'b', 'p', 'p', 'p'],
  ['', '', '', '', 'p', 'n', '', ''],
  ['', '', 'b', 'p', '', '', '', ''],
  ['', '', '', '', 'P', '', '', ''],
  ['', '', 'N', '', '', 'N', '', ''],
  ['P', 'P', 'P', 'P', '', 'P', 'P', 'P'],
  ['R', '', 'B', 'Q', 'K', 'B', '', 'R']
];

function generateBoardSvg(boardX, boardY, boardSize) {
  const sqSize = boardSize / 8;
  let svg = `
  <!-- Chessboard Container with Neubrutalist Shadow -->
  <g transform="translate(${boardX}, ${boardY})">
    <!-- Shadow -->
    <rect x="6" y="6" width="${boardSize}" height="${boardSize}" fill="#000000" />
    <!-- Outer Border -->
    <rect x="0" y="0" width="${boardSize}" height="${boardSize}" fill="#222222" stroke="#000000" stroke-width="3" />
    <!-- Squares -->
  `;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0;
      const color = isLight ? '#EEEED2' : '#769656';
      const x = c * sqSize;
      const y = r * sqSize;
      svg += `<rect x="${x}" y="${y}" width="${sqSize}" height="${sqSize}" fill="${color}" />\n`;

      const pieceKey = boardLayout[r][c];
      if (pieceKey && pieces[pieceKey]) {
        const p = pieces[pieceKey];
        const padding = sqSize * 0.08;
        const pSize = sqSize - padding * 2;
        svg += `
        <svg x="${x + padding}" y="${y + padding}" width="${pSize}" height="${pSize}" viewBox="${p.viewBox}">
          ${p.inner}
        </svg>
        `;
      }
    }
  }

  svg += `</g>`;
  return svg;
}

function generateMarqueeSvg() {
  const width = 1400;
  const height = 560;
  const boardSize = 480;
  const boardX = 850;
  const boardY = 40;

  const boardSvg = generateBoardSvg(boardX, boardY, boardSize);

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <!-- Background -->
    <rect width="${width}" height="${height}" fill="#18181B" />

    <!-- Left Content Column -->
    <g transform="translate(70, 75)">
      <!-- Title -->
      <text x="0" y="62" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="78px" font-weight="900" letter-spacing="-1px">
        <tspan fill="#FFFFFF">SABIO</tspan><tspan fill="#FF4F00">CHESS</tspan>
      </text>

      <!-- Subtitle -->
      <text x="0" y="118" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="26px" font-weight="700" fill="#E4E4E7">
        Instant Game Review for Chess.com &amp; Lichess
      </text>

      <!-- 3 Neubrutalist Pills -->
      <g transform="translate(0, 160)">
        <!-- Pill 1: 100% FREE -->
        <g transform="translate(0, 0)">
          <rect x="5" y="5" width="180" height="48" fill="#000000" />
          <rect x="0" y="0" width="180" height="48" fill="#FFFFFF" stroke="#000000" stroke-width="3" />
          <text x="90" y="31" text-anchor="middle" font-family="monospace, Courier New" font-size="19px" font-weight="bold" fill="#000000">[ 100% FREE ]</text>
        </g>

        <!-- Pill 2: WASM STOCKFISH -->
        <g transform="translate(205, 0)">
          <rect x="5" y="5" width="240" height="48" fill="#000000" />
          <rect x="0" y="0" width="240" height="48" fill="#FFFFFF" stroke="#000000" stroke-width="3" />
          <text x="120" y="31" text-anchor="middle" font-family="monospace, Courier New" font-size="19px" font-weight="bold" fill="#000000">[ WASM STOCKFISH ]</text>
        </g>

        <!-- Pill 3: AI VOICE COACH -->
        <g transform="translate(470, 0)">
          <rect x="5" y="5" width="230" height="48" fill="#000000" />
          <rect x="0" y="0" width="230" height="48" fill="#FFFFFF" stroke="#000000" stroke-width="3" />
          <text x="115" y="31" text-anchor="middle" font-family="monospace, Courier New" font-size="19px" font-weight="bold" fill="#000000">[ AI VOICE COACH ]</text>
        </g>
      </g>

      <!-- Orange CTA Button -->
      <g transform="translate(0, 255)">
        <rect x="6" y="6" width="480" height="66" fill="#000000" />
        <rect x="0" y="0" width="480" height="66" fill="#FF4F00" stroke="#000000" stroke-width="3.5" />
        <text x="240" y="42" text-anchor="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="23px" font-weight="900" fill="#FFFFFF" letter-spacing="1px">REVIEW ON SABIOCHESS</text>
      </g>

      <!-- Trust Badges Under Button -->
      <g transform="translate(0, 365)">
        <text x="0" y="0" font-family="monospace, Courier New" font-size="15px" fill="#A1A1AA" font-weight="bold">
          • UNLIMITED REVIEWS   • 100% CLIENT-SIDE   • ZERO TRACKING
        </text>
      </g>
    </g>

    <!-- Right Column: Chessboard -->
    ${boardSvg}
  </svg>
  `;
}

function generateSmallSvg() {
  const width = 440;
  const height = 280;
  const boardSize = 196;
  const boardX = 224;
  const boardY = 42;

  const boardSvg = generateBoardSvg(boardX, boardY, boardSize);

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <!-- Background -->
    <rect width="${width}" height="${height}" fill="#18181B" />

    <!-- Left Content Column -->
    <g transform="translate(18, 30)">
      <!-- Title -->
      <text x="0" y="28" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="27px" font-weight="900" letter-spacing="-0.5px">
        <tspan fill="#FFFFFF">SABIO</tspan><tspan fill="#FF4F00">CHESS</tspan>
      </text>

      <!-- Subtitle -->
      <text x="0" y="52" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="11px" font-weight="bold" fill="#E4E4E7">
        Chess.com &amp; Lichess Reviewer
      </text>

      <!-- Pill 1: 100% FREE -->
      <g transform="translate(0, 72)">
        <rect x="3" y="3" width="186" height="28" fill="#000000" />
        <rect x="0" y="0" width="186" height="28" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
        <text x="93" y="19" text-anchor="middle" font-family="monospace, Courier New" font-size="12px" font-weight="bold" fill="#000000">[ 100% FREE REVIEW ]</text>
      </g>

      <!-- Pill 2: WASM STOCKFISH -->
      <g transform="translate(0, 112)">
        <rect x="3" y="3" width="186" height="28" fill="#000000" />
        <rect x="0" y="0" width="186" height="28" fill="#FFFFFF" stroke="#000000" stroke-width="2" />
        <text x="93" y="19" text-anchor="middle" font-family="monospace, Courier New" font-size="12px" font-weight="bold" fill="#000000">[ WASM STOCKFISH ]</text>
      </g>

      <!-- Orange CTA Button -->
      <g transform="translate(0, 154)">
        <rect x="3.5" y="3.5" width="186" height="42" fill="#000000" />
        <rect x="0" y="0" width="186" height="42" fill="#FF4F00" stroke="#000000" stroke-width="2.5" />
        <text x="93" y="26" text-anchor="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="12px" font-weight="900" fill="#FFFFFF" letter-spacing="0.5px">REVIEW ON SABIOCHESS</text>
      </g>
    </g>

    <!-- Right Column: Chessboard -->
    ${boardSvg}
  </svg>
  `;
}

async function run() {
  const marqueeSvg = generateMarqueeSvg();
  const smallSvg = generateSmallSvg();

  fs.mkdirSync(path.join(__dirname, '../promo'), { recursive: true });

  // Render Marquee 1400x560
  await sharp(Buffer.from(marqueeSvg))
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toFile(path.join(__dirname, '../promo/marquee-promo-tile-1400x560.jpg'));

  await sharp(Buffer.from(marqueeSvg))
    .png({ progressive: false })
    .removeAlpha()
    .toFile(path.join(__dirname, '../promo/marquee-promo-tile-1400x560.png'));

  // Render Small 440x280
  await sharp(Buffer.from(smallSvg))
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toFile(path.join(__dirname, '../promo/small-promo-tile-440x280.jpg'));

  await sharp(Buffer.from(smallSvg))
    .png({ progressive: false })
    .removeAlpha()
    .toFile(path.join(__dirname, '../promo/small-promo-tile-440x280.png'));

  console.log('Successfully generated high-contrast vector promo tiles!');
}

run().catch(console.error);
