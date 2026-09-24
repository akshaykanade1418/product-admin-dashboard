"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth";

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState("emilys");
	const [password, setPassword] = useState("emilyspass");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (localStorage.getItem("accessToken")) {
			router.replace("/products");
		}
	}, [router]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const response = await loginUser(username, password);
			localStorage.setItem("accessToken", response.accessToken);
			router.replace("/products");
		} catch {
			setError("Invalid username or password. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
			<section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
				<div className="mb-8">
					<p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
						Admin Portal
					</p>
					<h1 className="text-3xl font-bold tracking-tight text-slate-950">
						Product Admin Dashboard
					</h1>
					<p className="mt-2 text-slate-600">Sign in to manage your products.</p>
				</div>

				<form className="space-y-5" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="username" className="mb-1 block text-sm font-semibold text-slate-900">
							Username
						</label>
						<input
							id="username"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							autoComplete="username"
							required
							className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-900">
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="current-password"
							required
							className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
						/>
					</div>

					{error && (
						<p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={isLoading}
						className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isLoading ? "Signing in..." : "Login"}
					</button>
				</form>
			</section>
		</main>
	);
}