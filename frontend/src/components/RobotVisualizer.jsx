import React from 'react';

const RobotVisualizer = ({ status, action }) => {
  const isExecuting = status === 1;
  const isCompleted = status === 2;
  const robotColor = isExecuting ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--text-dim)';

  return (
    <div className="robot-visualizer glass" style={{ height: '260px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div className="drone-container">
        <div>
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
            <path d="M30 50H70L80 58V65L70 73H30L20 65V58L30 50Z" stroke={robotColor} strokeWidth="2" />
            <circle cx="50" cy="62" r="5" stroke={robotColor} strokeWidth="1" />
            {isExecuting && <circle cx="50" cy="62" r="2" fill="var(--error)" />}
          </svg>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '10px', fontSize: '0.7rem', color: robotColor, fontWeight: 'bold' }}>
        {isExecuting ? `EXECUTING: ${action.toUpperCase()}` : isCompleted ? "TASK_COMPLETED" : "IDLE_STANDBY"}
      </div>
    </div>
  );
};

export default RobotVisualizer;
