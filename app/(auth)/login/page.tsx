"use client"

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LoginForm = {
    email: string;
    password: string;
};

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState<LoginForm>({
        email: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setField = <K extends keyof LoginForm>(field: K, value: LoginForm[K]) => {
        setForm((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        if (!form.email || !form.password) {
            setError("Please enter both email and password.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: form.email, password: form.password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Invalid credentials.");
                setLoading(false);
                return;
            }

            localStorage.setItem("currentUser", JSON.stringify({
                id: data.id,
                username: data.name,
                email: data.email,
                isGuest: false
            }));

            router.push("/");
        } catch {
            setError("Unable to login. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen box-border justify-center items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 transition-colors">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-w-md w-full flex-col rounded-2xl p-6 shadow-lg">
                <h1 className="mb-6 text-center text-2xl font-bold sm:text-3xl text-slate-900 dark:text-white">
                    Login
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error ? (
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 rounded-xl p-3">
                            {error}
                        </p>
                    ) : null}

                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        className="h-11 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        className="h-11 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-11 rounded-xl font-bold text-xl text-white mt-2 bg-blue-500 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {loading ? "Loading..." : "Login"}
                    </button>

                    <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                        Don&apos;t have an account? <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Register</Link>
                    </p>
                    <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                        Want to join as guest? <Link href="/guest-login" className="text-blue-600 dark:text-blue-400 hover:underline">Guest Access</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
