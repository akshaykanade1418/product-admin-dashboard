"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getProduct, Product } from "@/lib/api/products";

function ProductDetailPageContent() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const searchParams = useSearchParams();
	const [authChecked, setAuthChecked] = useState(false);
	const [product, setProduct] = useState<Product | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		if (!localStorage.getItem("accessToken")) {
			router.replace("/");
			return;
		}

		const authCheck = window.setTimeout(() => setAuthChecked(true), 0);

		return () => window.clearTimeout(authCheck);
	}, [router]);

	useEffect(() => {
		if (!authChecked) {
			return;
		}

		const loadProduct = async () => {
			try {
				setLoading(true);
				setError("");
				setNotFound(false);
				setProduct(await getProduct(params.id));
			} catch (requestError) {
				if (isAxiosError(requestError) && requestError.response?.status === 404) {
					setNotFound(true);
				} else {
					setError("Unable to load this product. Please try again.");
				}
			} finally {
				setLoading(false);
			}
		};

		loadProduct();
	}, [authChecked, params.id]);

	const returnQuery = searchParams.toString();
	const backHref = returnQuery ? `/products?${returnQuery}` : "/products";

	if (!authChecked) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
				<p className="text-slate-600">Loading...</p>
			</main>
		);
	}

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
				<p className="text-lg text-slate-600">Loading product...</p>
			</main>
		);
	}

	if (notFound) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4">
				<h1 className="text-3xl font-bold text-slate-950">Product Not Found</h1>
				<Link
					href={backHref}
					className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
				>
					Back to Products
				</Link>
			</main>
		);
	}

	if (error || !product) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-4">
				<p className="text-rose-600">{error || "Product details are unavailable."}</p>
				<Link
					href={backHref}
					className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600"
				>
					Back to Products
				</Link>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
			<div className="mx-auto max-w-5xl">
				<Link
					href={backHref}
					className="mb-6 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
				>
					Back to Products
				</Link>

				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="grid gap-8 p-6 md:grid-cols-2 md:p-8">
						<div className="space-y-4">
							<div className="flex h-80 items-center justify-center rounded-xl bg-slate-50 p-6">
								<img
									src={product.images?.[0] ?? product.thumbnail}
									alt={product.title}
									className="h-full w-full object-contain mix-blend-multiply"
								/>
							</div>
							{product.images && product.images.length > 1 && (
								<div className="grid grid-cols-4 gap-2">
									{product.images.slice(0, 4).map((image) => (
										<img
											key={image}
											src={image}
											alt={product.title}
											className="h-20 w-full rounded-lg bg-slate-50 object-contain p-2"
										/>
									))}
								</div>
							)}
						</div>

						<div>
							<p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
								<span className="capitalize">{product.category}</span>
							</p>
							<h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
								{product.title}
							</h1>
							<p className="mt-4 text-3xl font-bold text-indigo-600">
								${product.price.toFixed(2)}
							</p>
							<div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
								<div className="rounded-lg bg-slate-50 p-3">
									<p className="font-semibold text-slate-900">Rating</p>
									<p className="mt-1">⭐ {product.rating}</p>
								</div>
								<div className="rounded-lg bg-slate-50 p-3">
									<p className="font-semibold text-slate-900">Stock</p>
									<p className="mt-1">{product.stock} available</p>
								</div>
							</div>
							<p className="mt-6 leading-7 text-slate-600">
								{product.description || "No description available."}
							</p>
						</div>
					</div>

					<div className="border-t border-slate-200 p-6 md:p-8">
						<h2 className="text-xl font-bold text-slate-950">Reviews</h2>
						{product.reviews && product.reviews.length > 0 ? (
							<div className="mt-4 grid gap-4 md:grid-cols-2">
								{product.reviews.map((review) => (
									<article
										key={`${review.reviewerEmail}-${review.date}-${review.comment}`}
										className="rounded-xl bg-slate-50 p-4"
									>
										<div className="flex items-center justify-between gap-3">
											<p className="font-semibold text-slate-900">
												{review.reviewerName}
											</p>
											<span className="text-sm text-slate-600">
												⭐ {review.rating}
											</span>
										</div>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											{review.comment}
										</p>
									</article>
								))}
							</div>
						) : (
							<p className="mt-3 text-slate-600">No reviews available.</p>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}

export default function ProductDetailPage() {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
					<p className="text-slate-600">Loading...</p>
				</main>
			}
		>
			<ProductDetailPageContent />
		</Suspense>
	);
}