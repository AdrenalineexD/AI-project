import React from "react";

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };
    static getDerivedStateFromError(error: Error): State { return { error }; }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[ErrorBoundary]", error, info);
    }
    reset = () => this.setState({ error: null });
    render() {
        if (this.state.error) {
            return (
                <div style={{
                    padding: 40, color: "#e6ecf5", fontFamily: "system-ui, sans-serif",
                    background: "#0a0d14", minHeight: "100vh",
                }}>
                    <h1 style={{ color: "#ff6a3d" }}>⚠ Something crashed</h1>
                    <pre style={{
                        whiteSpace: "pre-wrap", background: "#131a28", padding: 16,
                        borderRadius: 8, border: "1px solid #1f2b40", fontSize: 12,
                    }}>{String(this.state.error?.stack || this.state.error)}</pre>
                    <button onClick={this.reset} style={{
                        marginTop: 16, padding: "10px 18px", borderRadius: 8,
                        background: "linear-gradient(135deg,#ff6a3d,#ffb703)",
                        color: "#1a1208", fontWeight: 700, border: "none", cursor: "pointer",
                    }}>Try to recover</button>
                </div>
            );
        }
        return this.props.children;
    }
}