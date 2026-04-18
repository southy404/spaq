import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { RegisterSchema, type RegisterInput } from "../lib/authSchemas";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import BrandLogo from "../components/layout/BrandLogo";

type RegisterResponseUser = {
  _id: string;
  name: string;
  email: string;
  role: "athlete" | "coach";
  onboardingCompleted?: boolean;
};

type RegisterResponse = {
  success: boolean;
  data: {
    token: string;
    user: RegisterResponseUser;
  };
};

function getNextPath(user: RegisterResponseUser) {
  if (user.role === "coach") return "/coach";
  return user.onboardingCompleted ? "/athlete" : "/onboarding";
}

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "athlete",
    },
    mode: "onSubmit",
  });

  const role = watch("role");

  const onSubmit = async (values: RegisterInput) => {
    setServerError("");

    try {
      const payload = {
        ...values,
        email: values.email.trim().toLowerCase(),
        name: values.name.trim(),
      };

      const { data } = await api.post<RegisterResponse>(
        "/auth/register",
        payload
      );

      const token = data?.data?.token;
      const user = data?.data?.user;

      if (!token || !user) {
        throw new Error("Invalid register response");
      }

      login(token, user);
      navigate(getNextPath(user), { replace: true });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.error ?? err?.message ?? "Registration failed"
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo imageClassName="h-12 w-auto" />
          </div>

          <h1 className="text-2xl font-semibold text-primary">
            Create account
          </h1>
          <p className="mt-1 text-sm text-muted">
            Start tracking your performance
          </p>
        </div>

        <div className="rounded-3xl border border-subtle bg-surface p-6 shadow-[0_10px_40px_rgba(0,0,0,0.10)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-subtle bg-surface-2 p-1">
              {(["athlete", "coach"] as const).map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
                    role === r
                      ? "bg-[#FFD300] text-[#0f0f13]"
                      : "text-muted hover:text-primary"
                  }`}
                >
                  <input
                    {...register("role")}
                    type="radio"
                    value={r}
                    className="sr-only"
                  />
                  {r === "athlete" ? "🏃 Athlete" : "📋 Coach"}
                </label>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-secondary">
                Name
              </label>
              <input
                {...register("name")}
                autoComplete="name"
                placeholder="Your name"
                className="w-full rounded-xl border border-subtle bg-surface-2 px-4 py-3 text-primary placeholder:text-muted transition-all focus:border-[#FFD300]/50 focus:bg-surface-3 focus:outline-none"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

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
                autoComplete="new-password"
                placeholder="Min. 8 characters"
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
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#c99700] transition-colors hover:text-[#FFD300] dark:text-[#FFD300] dark:hover:text-[#ffe066]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
