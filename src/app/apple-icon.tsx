import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const scale = 180 / 512;
  
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1b1c2b',
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
              backgroundColor: '#F2C1A3',
              borderTopRightRadius: `${24 * scale}px`,
              borderBottomRightRadius: `${24 * scale}px`,
            }}
          />
          
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
    { ...size }
  );
}
