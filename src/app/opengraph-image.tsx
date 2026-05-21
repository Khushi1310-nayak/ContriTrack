import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ContriTrack | Enterprise Academic Telemetry';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function og() {
  const scale = 150 / 512; // Base icon scale

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1b1c2b',
          padding: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Logo Mark */}
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: `${280 * scale}px`,
              height: `${280 * scale}px`,
            }}
          >
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

          {/* Wordmark */}
          <div
            style={{
              display: 'flex',
              fontSize: 84,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            ContriTrack
          </div>
        </div>

        <div
          style={{
            marginTop: '40px',
            fontSize: 32,
            color: '#857C91',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Academic Collaboration & Contribution Telemetry
        </div>
      </div>
    ),
    { ...size }
  );
}
