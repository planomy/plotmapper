import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class RootErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state: { err: Error | null } = { err: null }

  static getDerivedStateFromError(err: Error) {
    return { err }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(err, info.componentStack)
  }

  render() {
    if (this.state.err) {
      const err = this.state.err
      return (
        <div
          style={{
            fontFamily: 'system-ui,sans-serif',
            padding: 24,
            maxWidth: 560,
            margin: '48px auto',
            lineHeight: 1.5,
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>Plotmapper hit an error</h1>
          <p style={{ color: '#444', marginBottom: 16 }}>
            Something went wrong while loading the app. Try a hard refresh. If you recently upgraded the app, clear
            site data for this origin or remove the <code>plotmapper-v1</code> key from local storage and reload.
          </p>
          <pre
            style={{
              background: '#f4f4f5',
              padding: 12,
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 13,
            }}
          >
            {err instanceof Error ? err.message : String(err)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
