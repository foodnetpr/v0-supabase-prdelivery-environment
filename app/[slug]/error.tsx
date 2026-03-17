'use client'

export default function Error({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1rem' }}>Something went wrong loading this restaurant</h2>
      <div style={{ 
        color: 'red', 
        fontSize: '12px', 
        fontFamily: 'monospace', 
        backgroundColor: '#fee', 
        padding: '1rem', 
        borderRadius: '4px',
        marginBottom: '1rem',
        textAlign: 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {error.message}
        {error.stack && (
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{ cursor: 'pointer' }}>Stack trace</summary>
            <pre style={{ fontSize: '10px', overflow: 'auto' }}>{error.stack}</pre>
          </details>
        )}
      </div>
      <button 
        onClick={reset}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Try again
      </button>
    </div>
  )
}
