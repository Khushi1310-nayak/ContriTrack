import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const size = parseInt(searchParams.get('size') || '512', 10);

  // Validate standard sizes
  const validSizes = [64, 128, 192, 256, 512];
  const finalSize = validSizes.includes(size) ? size : 512;

  // The base size of our SVG coordinate system is 512x512
  // We will scale the inner elements proportionately using Flexbox
  const scale = finalSize / 512;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#141523', // Deep matte dark
          borderRadius: `${100 * scale}px`, // Slight squircle rounding for standalone
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: `${280 * scale}px`,
            height: `${280 * scale}px`,
          }}
        >
          {/* Main "C" structure representing ContriTrack */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${140 * scale}px`,
              height: '100%',
              borderTopLeftRadius: `${140 * scale}px`,
              borderBottomLeftRadius: `${140 * scale}px`,
              borderLeft: `${48 * scale}px solid white`,
              borderTop: `${48 * scale}px solid white`,
              borderBottom: `${48 * scale}px solid white`,
            }}
          />

          {/* Abstract T / Telemetry Node intersection */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: `${116 * scale}px`,
              width: `${160 * scale}px`,
              height: `${48 * scale}px`,
              backgroundColor: '#F2C1A3', // Peach accent
              borderTopRightRadius: `${24 * scale}px`,
              borderBottomRightRadius: `${24 * scale}px`,
            }}
          />
          
          {/* Synchronized Parity Dot */}
          <div
            style={{
              position: 'absolute',
              right: `${50 * scale}px`,
              top: 0,
              width: `${48 * scale}px`,
              height: `${48 * scale}px`,
              backgroundColor: 'white',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
    ),
    {
      width: finalSize,
      height: finalSize,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
