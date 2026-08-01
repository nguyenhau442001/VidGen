import React from "react";
import { AbsoluteFill } from "remotion";

type Props = {
  label: string;
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class SceneErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(`[SceneErrorBoundary] ${this.props.label}:`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <AbsoluteFill
          style={{
            backgroundColor: "#1a0000",
            color: "#ff6666",
            fontFamily: "monospace",
            fontSize: 28,
            padding: 60,
            justifyContent: "center",
          }}
        >
          <div>Scene error: {this.props.label}</div>
          <div style={{ fontSize: 18, marginTop: 12, color: "#ff9999" }}>
            {this.state.error.message}
          </div>
        </AbsoluteFill>
      );
    }
    return this.props.children;
  }
}
