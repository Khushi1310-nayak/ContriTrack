import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Favicon generation
export default function Icon() {
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
            position: 'absolute',
            left: 0,
            top: 0,
            width: '16px',
            height: '100%',
            borderTopLeftRadius: '16px',
            borderBottomLeftRadius: '16px',
            borderLeft: '6px solid white',
            borderTop: '6px solid white',
            borderBottom: '6px solid white',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '12px',
            width: '20px',
            height: '8px',
            backgroundColor: '#F2C1A3',
            borderTopRightRadius: '4px',
            borderBottomRightRadius: '4px',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
