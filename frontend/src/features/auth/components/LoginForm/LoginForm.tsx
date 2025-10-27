import { useCallback, useId, useState } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import "./LoginForm.css";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const { error } = await signIn(email, password);

        if (error) {
          setError(error.message);
        } else {
          onSuccess?.();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "ログインに失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [email, password, signIn, onSuccess],
  );

  return (
    <div className="login-form-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>ログイン</h2>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor={emailId}>メールアドレス</label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            disabled={loading}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor={passwordId}>パスワード</label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            required
            disabled={loading}
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="submit-button"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
