import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2.5rem',
          margin: '2rem auto',
          maxWidth: '800px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1.5px dashed #EF4444',
          borderRadius: 20,
          color: '#EF4444',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
          <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.2rem', fontWeight: 800 }}>
            {this.props.name || "Component"} failed to render
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5 }}>
            Error: {this.state.error?.message || "Unknown error occurred"}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
