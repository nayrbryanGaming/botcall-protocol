import React from 'react';

const RobotVisualizer = ({ status, action }) => {
  // status: 0 (Pending), 1 (Executing), 2 (Completed)
  const isExecuting = status === 1;
  const isCompleted = status === 2;
  const isPending = status === 0;

  return (
    <div className="robot-visualizer glass" style={{ 
      height: '300px', 
      position: 'relative', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
      border: '1px solid var(--glass-border)',
      borderRadius: '20px',
      marginBottom: '2rem'
    }}>
      {/* HUD Background Decorations */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        VISUAL_FEED_01 // CRC: {Math.random().toString(16).slice(2, 6).toUpperCase()}
      </div>
      <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        LATENCY: 24ms // STABILITY: 99.9%
      </div>

      <div className="drone-container" style={{ position: 'relative' }}>
        {/* Holographic Grid Background */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, var(--glass-border) 1px, transparent 1px), linear-gradient(var(--glass-border) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.2,
          pointerEvents: 'none'
        }}></div>

        {/* Core Robot SVG (Professional Drone/Mech style) */}
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main Body */}
          <path d="M30 40H70L80 50V60L70 70H30L20 60V50L30 40Z" stroke="var(--primary)" strokeWidth="2" fill="rgba(0,242,255,0.05)" />
          {/* Rotors */}
          <g>
            <ellipse cx="20" cy="40" rx="10" ry="2" stroke="var(--primary)" strokeWidth="1">
                <animate attributeName="ry" values="2;0.5;2" dur="0.1s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="80" cy="40" rx="10" ry="2" stroke="var(--primary)" strokeWidth="1">
                <animate attributeName="ry" values="2;0.5;2" dur="0.1s" repeatCount="indefinite" />
            </ellipse>
          </g>
          {/* Eye/Sensor */}
          <circle cx="50" cy="50" r="8" stroke="var(--primary)" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill={isExecuting ? "var(--error)" : "var(--primary)"} className={isExecuting ? "pulse-sensor" : ""}>
            {isExecuting && <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite" />}
          </circle>
          {/* Arms/Thrusters */}
          <g>
            <rect x="15" y="45" width="10" height="20" rx="2" stroke="var(--primary)" strokeWidth="2">
              {isExecuting && action === 'wave' && <animateTransform attributeName="transform" type="rotate" from="0 20 55" to="-30 20 55" dur="0.5s" repeatCount="indefinite" />}
            </rect>
            {isExecuting && action === 'pick object' && (
              <g transform="translate(15, 65)">
                <path d="M0,0 L-5,10 M10,0 L15,10" stroke="var(--primary)" strokeWidth="2">
                  <animateTransform attributeName="transform" type="scale" values="1,1;0.5,1;1,1" dur="1s" repeatCount="indefinite" />
                </path>
              </g>
            )}
          </g>
          <g>
            <rect x="75" y="45" width="10" height="20" rx="2" stroke="var(--primary)" strokeWidth="2">
              {isExecuting && action === 'wave' && <animateTransform attributeName="transform" type="rotate" from="0 80 55" to="30 80 55" dur="0.5s" repeatCount="indefinite" />}
            </rect>
            {isExecuting && action === 'pick object' && (
              <g transform="translate(75, 65)">
                <path d="M0,0 L-5,10 M10,0 L15,10" stroke="var(--primary)" strokeWidth="2">
                  <animateTransform attributeName="transform" type="scale" values="1,1;0.5,1;1,1" dur="1s" repeatCount="indefinite" />
                </path>
              </g>
            )}
          </g>
          {/* Scan Line / Patrol Laser */}
          {isExecuting && (action === 'scan' || action === 'patrol') && (
            <line x1="10" y1="50" x2="90" y2="50" stroke={action === 'patrol' ? 'var(--error)' : 'var(--primary)'} strokeWidth="1" opacity="0.6">
              <animate attributeName="y1" values="40;70;40" dur="2s" repeatCount="indefinite" />
              <animate attributeName="y2" values="40;70;40" dur="2s" repeatCount="indefinite" />
              {action === 'patrol' && <animate attributeName="stroke-width" values="1;3;1" dur="0.5s" repeatCount="indefinite" />}
            </line>
          )}
          {/* Antenna */}
          <line x1="50" y1="40" x2="50" y2="25" stroke="var(--primary)" strokeWidth="2" />
          <circle cx="50" cy="25" r="2" fill="var(--primary)" />
        </svg>

        {/* Action Specific Overlays (HTML-based) */}
        {isExecuting && action === 'scan' && (
          <div className="animate-scan" style={{ top: '0', left: '-20px', width: '160px' }}></div>
        )}
        
        {isExecuting && (action === 'move' || action === 'patrol') && (
          <div style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)' }}>
            <div className="animate-pulse" style={{ width: '40px', height: '10px', borderRadius: '50%', top: '0' }}></div>
          </div>
        )}

        {isExecuting && action === 'recharge' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="animate-pulse" style={{ width: '100px', height: '100px', border: '1px solid var(--primary)', opacity: 0.5 }}></div>
          </div>
        )}

        {isCompleted && (
          <div style={{ position: 'absolute', top: '-10px', right: '-10px' }}>
             <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
               <path d="M5 13l4 4L19 7" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
             </svg>
          </div>
        )}
      </div>

      {/* Action Text Display */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Current Task
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.05em', color: isExecuting ? 'var(--primary)' : '#fff' }}>
          {isPending ? "IDLE_AWAITING_INPUT" : action?.toUpperCase()}
        </div>
        <div style={{ fontSize: '0.65rem', color: isExecuting ? 'var(--primary)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
          {isExecuting ? ">>> EXECUTING_PROCEDURE_LOG..." : isCompleted ? ">>> TASK_SUCCESS_TERMINATED" : ">>> STANDBY_MODE"}
        </div>
      </div>
    </div>
  );
};

export default RobotVisualizer;
