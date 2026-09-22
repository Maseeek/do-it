import { ImageResponse } from 'next/og';

export const size = {
  width: 192,
  height: 192,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 72,
          background: '#08090a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          borderRadius: '38px',
          border: '4px solid #27272a',
          fontFamily: 'monospace',
          letterSpacing: '-2px',
        }}
      >
        DO
      </div>
    ),
    {
      ...size,
    }
  );
}
