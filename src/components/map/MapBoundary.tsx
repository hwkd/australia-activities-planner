import { Component, type ReactNode } from "react";

/**
 * Catches a map that can't load (its code is fetched on demand and isn't in the offline cache), so
 * the rest of the card keeps working: callers show a short message instead, and their list still works.
 */
export default class MapBoundary extends Component<{ fallback: ReactNode; onError?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
