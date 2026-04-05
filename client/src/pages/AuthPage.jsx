import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    try {
      if (mode === "signup") {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Campus Navigation</h1>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "login" ? "Login with your Firebase account." : "Create your account."}
        </p>

        {mode === "signup" && (
          <input
            name="name"
            placeholder="Full Name"
            className="mt-4 w-full rounded-md border px-3 py-2 text-sm"
            required
          />
        )}
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="mt-4 w-full rounded-md border px-3 py-2 text-sm"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="mt-3 w-full rounded-md border px-3 py-2 text-sm"
          required
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-3 w-full text-sm text-blue-700"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already registered? Login"}
        </button>
      </form>
    </div>
  );
};

export default AuthPage;
