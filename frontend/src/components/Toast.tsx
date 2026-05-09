import { ToastMsg } from '../App'

export default function Toast({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✅' : '❌'}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
