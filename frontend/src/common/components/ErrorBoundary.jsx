import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="center-page">
          <section className="form-card">
            <h1>Something went wrong</h1>
            <p>Please refresh the page or sign in again.</p>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

