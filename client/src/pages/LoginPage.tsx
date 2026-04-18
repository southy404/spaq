import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { LoginSchema, type LoginInput } from "../lib/authSchemas";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import BrandLogo from "../components/layout/BrandLogo";

type LoginResponseUser = {
  _id: string;
  name: string;
  email: string;
  role: "athlete" | "coach";
  onboardingCompleted?: boolean;
};

type LoginResponse = {
  success: boolean;
  data: {
    token: string;
    user: LoginResponseUser;
  };
};

function getNextPath(user: LoginResponseUser) {
  if (user.role === "coach") return "/coach";
  return user.onboardingCompleted ? "/athlete" : "/onboarding";
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError("");

    try {
      const { data } = await api.post<LoginResponse>("/auth/login", values);

      const token = data?.data?.token;
      const user = data?.data?.user;

      if (!token || !user) {
        throw new Error("Invalid login response");
      }

      login(token, user);
      navigate(getNextPath(user), { replace: true });
    } catch (err: any) {
      const apiError = err?.response?.data?.error;

      let message = "Login failed";

      if (typeof apiError === "string") {
        message = apiError;
      } else if (apiError?.fieldErrors) {
        const firstFieldError = Object.values(apiError.fieldErrors)
          .flat()
          .find(Boolean);

        if (firstFieldError) {
          message = String(firstFieldError);
        }
      } else if (apiError?.message) {
        message = String(apiError.message);
      } else if (err?.message) {
        message = String(err.message);
      }

      setServerError(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo imageClassName="h-12 w-auto" />
          </div>

          <h1 className="text-2xl font-semibold text-primary">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your account</p>
        </div>

        <div className="rounded-3xl border border-subtle bg-surface p-6 shadow-[0_10px_40px_rgba(0,0,0,0.10)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-secondary">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-primary placeholder:text-muted transition-all focus:border-[#FFD300]/50 focus:bg-surface-3 focus:outline-none"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-secondary">
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-primary placeholder:text-muted transition-all focus:border-[#FFD300]/50 focus:bg-surface-3 focus:outline-none"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#FFD300] py-3 font-medium text-[#0f0f13] transition-colors hover:bg-[#e6be00] disabled:opacity-50"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            No account?{" "}
            <Link
              to="/register"
              className="text-[#c99700] transition-colors hover:text-[#FFD300] dark:text-[#FFD300] dark:hover:text-[#ffe066]"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
