"use client"

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Country, State } from "country-state-city";
import Link from "next/link";

type Gender = "" | "male" | "female";

type RegisterForm = {
    username: string;
    email: string;
    password: string;
    gender: Gender;
    age: string;
    country: string;
    state: string;
};

const ages = Array.from({ length: 63 }, (_, i) => i + 18);

export default function RegisterPage() {
    const router = useRouter();
    const countries = Country.getAllCountries();
    const allStates = State.getAllStates();
    const getStatesByCountry = (countryCode: string) => {
        return countryCode ? allStates.filter((state) => state.countryCode === countryCode) : [];
    };

    const [form, setForm] = useState<RegisterForm>({
        username: "",
        email: "",
        password: "",
        gender: "",
        age: "",
        country: "",
        state: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setField = <K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) => {
        setForm((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        if (!form.username || !form.email || !form.password || !form.gender || !form.age || !form.country || !form.state) {
            setError("Please complete every field before registering.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.username,
                    email: form.email,
                    password: form.password
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Unable to register. Please try again.");
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
            setError("Unable to register. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full box-border justify-center items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 transition-colors">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-w-md w-full flex-col rounded-2xl p-6 shadow-lg">
                <h1 className="mb-6 text-center text-2xl font-bold sm:text-3xl text-slate-900 dark:text-white">
                    Register
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error ? (
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 rounded-xl p-3">
                            {error}
                        </p>
                    ) : null}

                    <input
                        type="text"
                        placeholder="Username"
                        value={form.username}
                        onChange={(e) => setField("username", e.target.value)}
                        className="h-11 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    />

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

                    <div className="flex gap-4">
                        <label className={`flex items-center gap-2 flex-1 border h-11 rounded-xl px-3 transition cursor-pointer ${form.gender === "male"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}>
                            <input
                                type="radio"
                                name="gender"
                                value="male"
                                checked={form.gender === "male"}
                                onChange={() => setField("gender", "male")}
                            />
                            <span>Male</span>
                        </label>

                        <label className={`flex items-center gap-2 flex-1 border h-11 rounded-xl px-3 transition cursor-pointer ${form.gender === "female"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            }`}>
                            <input
                                type="radio"
                                name="gender"
                                value="female"
                                checked={form.gender === "female"}
                                onChange={() => setField("gender", "female")}
                            />
                            <span>Female</span>
                        </label>
                    </div>

                    <select
                        value={form.age}
                        onChange={(e) => setField("age", e.target.value)}
                        className="rounded-2xl border bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 h-11 pl-3 pr-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                    >
                        <option value="" className="dark:bg-slate-900">Select Age</option>
                        {ages.map((age) => (
                            <option key={age} value={String(age)} className="dark:bg-slate-900">
                                {age}
                            </option>
                        ))}
                    </select>

                    <select
                        className="rounded-2xl border bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 h-11 pl-3 pr-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                        value={form.country}
                        onChange={(e) => {
                            setField("country", e.target.value);
                            setField("state", "");
                        }}
                    >
                        <option value="" className="dark:bg-slate-900">Select country</option>
                        {countries.map((country) => (
                            <option value={country.isoCode} key={country.isoCode} className="dark:bg-slate-900">
                                {country.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="rounded-2xl border bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 h-11 pl-3 pr-3 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                        value={form.state}
                        onChange={(e) => setField("state", e.target.value)}
                        disabled={!form.country}
                    >
                        <option value="" className="dark:bg-slate-900">Select state</option>
                        {getStatesByCountry(form.country).map((state) => (
                            <option value={state.isoCode} key={state.isoCode} className="dark:bg-slate-900">
                                {state.name}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-11 rounded-xl font-bold text-xl text-white mt-2 bg-blue-500 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer"
                    >
                        {loading ? "Registering..." : "Register"}
                    </button>

                    <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                        Already have an account? <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Login</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
