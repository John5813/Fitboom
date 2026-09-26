import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { reportError } from "@/lib/errorReporting";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Ilovaning istalgan joyidagi render xatosini ushlab, oq ekran o'rniga
 * tushunarli xabar ko'rsatadi.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Render xatosi:", error, errorInfo.componentStack);
    // Serverga ham yuboramiz — aks holda oq ekran haqida hech kim bilmaydi
    reportError(error.message, error.stack, `render: ${location.pathname}`);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
          <h1 className="text-xl font-semibold">Nimadir noto'g'ri ketdi</h1>
          <p className="text-sm text-muted-foreground">
            Sahifani yuklashda kutilmagan xatolik yuz berdi. Iltimos, sahifani yangilang.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-muted p-3 rounded overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
          <Button onClick={this.handleReload}>Sahifani yangilash</Button>
        </div>
      </div>
    );
  }
}
