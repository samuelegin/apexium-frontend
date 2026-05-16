/**
 * TelegramAuthButton.jsx — opens a small page on backend that hosts the Telegram login widget
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function TelegramAuthButton({ label = 'Continue with Telegram' }) {
  const handleClick = () => {
    // Open the backend page that hosts the Telegram widget
    window.location.href = `${API_BASE}/auth/telegram`;
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium text-foreground"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.5 13.5l8.5-6.5L6.5 17l-2.5-.9 5.5-1.6z" fill="#2AABEE"/>
      </svg>
      {label}
    </button>
  );
}
