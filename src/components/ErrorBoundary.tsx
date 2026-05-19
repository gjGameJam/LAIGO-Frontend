import { Component, type ReactNode } from 'react'

interface Props {
    children: ReactNode
}

interface State {
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null }

    static getDerivedStateFromError(error: Error): State {
        return { error }
    }

    componentDidCatch(error: Error) {
        console.error('ErrorBoundary caught:', error)
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-center px-4">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Something went wrong.
                        </p>
                        <p className="text-xs text-zinc-500">Try refreshing the page.</p>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
