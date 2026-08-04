import React from 'react';

import AppRecoveryScreen from './AppRecoveryScreen';

type Props = {
  children: React.ReactNode;
  resetKey: string;
  onRecover: () => void;
};

type State = {
  error: Error | null;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[render] 화면 렌더링 오류', error, info.componentStack);
  }

  componentDidUpdate(previousProps: Props) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleRecover = () => {
    this.setState({ error: null });
    this.props.onRecover();
  };

  render() {
    if (this.state.error) {
      return (
        <AppRecoveryScreen
          message="화면 처리 중 오류가 발생했습니다. 홈으로 돌아가 다시 시도해 주세요."
          onRetry={this.handleRecover}
        />
      );
    }

    return this.props.children;
  }
}
