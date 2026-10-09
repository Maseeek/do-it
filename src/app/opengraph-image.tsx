import { ImageResponse } from 'next/og';

export const alt = 'do: habit tracker - Minimalist habit tracker and daily accountability';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#09090b',
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.18) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.18) 0%, transparent 40%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '48px',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          justifyContent: 'space-between',
        }}
      >
        {/* Subtle border outline frame */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 24,
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Logo + Brand Name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* White Tile Logo */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.15)',
              }}
            >
              <span
                style={{
                  color: '#09090b',
                  fontSize: 34,
                  fontWeight: 900,
                  letterSpacing: '-2px',
                  paddingBottom: 2,
                }}
              >
                do
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '-0.5px',
                    color: '#ffffff',
                  }}
                >
                  do
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#a1a1aa',
                    padding: '2px 8px',
                    borderRadius: 6,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  habit tracker
                </span>
              </div>
            </div>
          </div>

          {/* Live App Pill Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 9999,
              padding: '8px 18px',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 10px #10b981',
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#d4d4d8',
                letterSpacing: '-0.2px',
              }}
            >
              do-it-plum-seven.vercel.app
            </span>
          </div>
        </div>

        {/* Center Hero Block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '900px',
            marginTop: '20px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: 62,
              fontWeight: 800,
              letterSpacing: '-2px',
              lineHeight: 1.1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ color: '#ffffff' }}>Minimalist habit tracking.</span>
            <span
              style={{
                backgroundImage: 'linear-gradient(90deg, #60a5fa 0%, #c084fc 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: '#60a5fa',
              }}
            >
              Head-to-head accountability.
            </span>
          </div>

          <div
            style={{
              fontSize: 22,
              lineHeight: 1.45,
              color: '#a1a1aa',
              fontWeight: 400,
              maxWidth: '780px',
            }}
          >
            Two-player calibrated habit parity, wearable telemetry sync with Apple &amp; Google Health, and real-world stakes.
          </div>
        </div>

        {/* Feature Cards Row */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            width: '100%',
          }}
        >
          {/* Card 1: Head-to-Head Duels */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '18px 20px',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>
                Head-to-Head Duels
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#71717a', lineHeight: 1.4 }}>
              Asymmetric habit parity and weekly wagers
            </span>
          </div>

          {/* Card 2: Wearables Telemetry */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '18px 20px',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 18 }}>⌚</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>
                Wearable Telemetry
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#71717a', lineHeight: 1.4 }}>
              Apple Health, Google Health &amp; Strava
            </span>
          </div>

          {/* Card 3: Consistency & Karma */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '18px 20px',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 18 }}>🔥</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5' }}>
                Streaks &amp; Karma
              </span>
            </div>
            <span style={{ fontSize: 13, color: '#71717a', lineHeight: 1.4 }}>
              240 Daily Par, rest-day buffer &amp; lifetime records
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
