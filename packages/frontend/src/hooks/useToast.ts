// The canonical ToastProvider/useToast implementation lives in
// components/common/Toast.tsx — it's a UI component (renders the toast
// viewport via a portal) as much as it is state, so it belongs with the
// rest of components/common rather than here. Re-exported under the
// requested hooks/ path for convenience; `success/error/warning/info` are
// the "shortcuts" and each toast already auto-dismisses via its `duration`
// option (default 4s) — see ToastOptions in Toast.tsx.
export { ToastProvider, useToast } from '../components/common/Toast';
export type { ToastOptions, ToastPosition, ToastType } from '../components/common/Toast';
