import { Component, StrictMode } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./styles.css";

class DesktopErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error): { error: string } {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Desktop renderer failed", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) return <main className="status-screen fatal-screen"><h1>BridgePane could not start</h1><p>{this.state.error}</p><small>Close the window and run the application from a terminal for diagnostic output.</small></main>;
    return this.props.children;
  }
}

const root = createRoot(document.getElementById("root")!);
if (typeof window.codexDesktop === "undefined") {
  root.render(<main className="status-screen fatal-screen"><h1>Desktop bridge unavailable</h1><p>The secure preload did not initialize.</p><small>Close the window and run the application from a terminal for diagnostic output.</small></main>);
} else {
  root.render(<StrictMode><DesktopErrorBoundary><App /></DesktopErrorBoundary></StrictMode>);
}
