"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	addProduct,
	deleteProduct,
	getProductCategories,
	getProducts,
	getProductsByCategory,
	NewProduct,
	Product,
	ProductSortBy,
	ProductSortOrder,
	searchProducts,
	updateProduct,
} from "@/lib/api/products";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;
const SORT_OPTIONS = {
	default: { label: "Sort by", sortBy: undefined, order: undefined },
	"title-asc": { label: "Title A–Z", sortBy: "title", order: "asc" },
	"title-desc": { label: "Title Z–A", sortBy: "title", order: "desc" },
	"price-asc": { label: "Price: Low to high", sortBy: "price", order: "asc" },
	"price-desc": { label: "Price: High to low", sortBy: "price", order: "desc" },
	"rating-desc": { label: "Rating: High to low", sortBy: "rating", order: "desc" },
} as const;
type SortValue = keyof typeof SORT_OPTIONS;

const emptyProductForm: NewProduct = {
	title: "",
	price: 0,
	category: "",
	stock: 0,
	description: "",
};

function ProductsPageContent() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const requestedPage = Number(searchParams.get("page"));
	const pageParam = searchParams.get("page");
	const requestedLimit = Number(searchParams.get("limit"));
	const search = searchParams.get("search") ?? "";
	const [searchInput, setSearchInput] = useState(search);
	const categoryParam = searchParams.get("category") ?? "";
	const requestedSort = searchParams.get("sort") ?? "";
	const sort: SortValue = requestedSort in SORT_OPTIONS
		? (requestedSort as SortValue)
		: "default";
	const page = Number.isInteger(requestedPage) && requestedPage > 0
		? requestedPage
		: 1;
	const limit = PAGE_SIZE_OPTIONS.includes(requestedLimit)
		? requestedLimit
		: DEFAULT_PAGE_SIZE;
	const [products, setProducts] = useState<Product[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
	const [categories, setCategories] = useState<string[]>([]);
	const [categoriesLoaded, setCategoriesLoaded] = useState(false);
	const [productFormMode, setProductFormMode] = useState<"add" | "edit" | null>(null);
	const [editingProductId, setEditingProductId] = useState<number | null>(null);
	const [productForm, setProductForm] = useState<NewProduct>(emptyProductForm);
	const [formError, setFormError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const [authChecked, setAuthChecked] = useState(false);
	const productRequestId = useRef(0);

	useEffect(() => {
		if (!localStorage.getItem("accessToken")) {
			router.replace("/");
			return;
		}

		const authCheck = window.setTimeout(() => setAuthChecked(true), 0);

		return () => window.clearTimeout(authCheck);
	}, [router]);

	useEffect(() => {
		const searchInputSync = window.setTimeout(
			() => setSearchInput(search),
			0
		);

		return () => window.clearTimeout(searchInputSync);
	}, [search]);

	useEffect(() => {
		const searchTimer = window.setTimeout(() => {
			const nextSearch = searchInput.trim();

			if (nextSearch !== search) {
				const params = new URLSearchParams(searchParams.toString());
				params.set("page", "1");
				params.set("limit", String(limit));

				if (nextSearch) {
					params.set("search", nextSearch);
				} else {
					params.delete("search");
				}

				router.push(`${pathname}?${params.toString()}`);
			}
		}, 400);

		return () => window.clearTimeout(searchTimer);
	}, [limit, pathname, router, search, searchInput, searchParams]);

	useEffect(() => {
		if (!authChecked) {
			return;
		}

		const loadCategories = async () => {
			try {
				setCategories(await getProductCategories());
			} catch {
				setError("Failed to load product categories.");
			} finally {
				setCategoriesLoaded(true);
			}
		};

		loadCategories();
	}, [authChecked]);

	const category = categories.includes(categoryParam) ? categoryParam : "";

	useEffect(() => {
		if (!categoriesLoaded) {
			return;
		}

		const params = new URLSearchParams(searchParams.toString());
		let changed = false;
		const hasValidPageParam =
			pageParam === null ||
			(Number.isInteger(Number(pageParam)) && Number(pageParam) >= 1);

		if (!hasValidPageParam) {
			params.set("page", "1");
			changed = true;
		}

		if (categoryParam && !categories.includes(categoryParam)) {
			params.delete("category");
			changed = true;
		}

		if (requestedSort && requestedSort !== sort) {
			params.delete("sort");
			changed = true;
		}

		if (changed) {
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [categories, categoriesLoaded, categoryParam, pageParam, pathname, requestedSort, router, searchParams, sort]);

	useEffect(() => {
		if (!authChecked || !categoriesLoaded) {
			return;
		}

		const requestId = ++productRequestId.current;
		const controller = new AbortController();

		const loadProducts = async () => {
			try {
				setLoading(true);
				setError("");

				const skip = (page - 1) * limit;

				const sortConfig = SORT_OPTIONS[sort];
				const sortOptions = sortConfig.sortBy
					? {
						sortBy: sortConfig.sortBy as ProductSortBy,
						order: sortConfig.order as ProductSortOrder,
					}
					: undefined;

				const commitProducts = (nextProducts: Product[], nextTotal: number) => {
					const availablePages = Math.max(1, Math.ceil(nextTotal / limit));

					if (page > availablePages) {
						const params = new URLSearchParams(searchParams.toString());
						params.set("page", String(availablePages));
						router.replace(`${pathname}?${params.toString()}`);
						return;
					}

					setProducts(nextProducts);
					setTotal(nextTotal);
				};

				if (search && category) {
					const data = await searchProducts(search, 0, 0, controller.signal, sortOptions);
					if (requestId !== productRequestId.current) {
						return;
					}
					const filteredProducts = data.products.filter(
						(product) => product.category === category
					);

					commitProducts(filteredProducts.slice(skip, skip + limit), filteredProducts.length);
				} else if (search) {
					const data = await searchProducts(search, limit, skip, controller.signal, sortOptions);
					if (requestId !== productRequestId.current) {
						return;
					}

					commitProducts(data.products, data.total);
				} else if (category) {
					const data = await getProductsByCategory(category, limit, skip, {
						...sortOptions,
						signal: controller.signal,
					});
					if (requestId !== productRequestId.current) {
						return;
					}

					commitProducts(data.products, data.total);
				} else {
					const data = await getProducts(limit, skip, {
						...sortOptions,
						signal: controller.signal,
					});
					if (requestId !== productRequestId.current) {
						return;
					}

					commitProducts(data.products, data.total);
				}
			} catch {
				if (controller.signal.aborted || requestId !== productRequestId.current) {
					return;
				}

				setError("Failed to load products.");
			} finally {
				if (!controller.signal.aborted && requestId === productRequestId.current) {
					setLoading(false);
					setHasLoadedProducts(true);
				}
			}
		};

		loadProducts();

		return () => controller.abort();
	}, [authChecked, categoriesLoaded, category, limit, page, refreshKey, router, pathname, search, searchParams, sort]);

	const totalPages = Math.max(1, Math.ceil(total / limit));
	const firstProduct = total === 0 ? 0 : (page - 1) * limit + 1;
	const lastProduct = Math.min(page * limit, total);

	const updateUrl = (changes: {
		page?: number;
		limit?: number;
		search?: string;
		category?: string;
		sort?: SortValue;
	}) => {
		const params = new URLSearchParams(searchParams.toString());
		const nextPage = changes.page ?? page;
		const nextLimit = changes.limit ?? limit;

		params.set("page", String(nextPage));
		params.set("limit", String(nextLimit));

		if (changes.search !== undefined) {
			if (changes.search) {
				params.set("search", changes.search);
			} else {
				params.delete("search");
			}
		}

		if (changes.category !== undefined) {
			if (changes.category) {
				params.set("category", changes.category);
			} else {
				params.delete("category");
			}
		}

		if (changes.sort !== undefined) {
			if (changes.sort === "default") {
				params.delete("sort");
			} else {
				params.set("sort", changes.sort);
			}
		}

		router.push(`${pathname}?${params.toString()}`);
	};

	const handleLogout = () => {
		localStorage.removeItem("accessToken");
		router.replace("/");
	};

	const retryProductFetch = () => {
		if (!loading) {
			setLoading(true);
			setRefreshKey((currentKey) => currentKey + 1);
		}
	};

	const openAddProductForm = () => {
		setProductForm(emptyProductForm);
		setFormError("");
		setSuccessMessage("");
		setEditingProductId(null);
		setProductFormMode("add");
	};

	const openEditProductForm = (product: Product) => {
		setProductForm({
			title: product.title,
			price: product.price,
			category: product.category,
			stock: product.stock,
			description: product.description ?? "",
		});
		setFormError("");
		setSuccessMessage("");
		setEditingProductId(product.id);
		setProductFormMode("edit");
	};

	const closeAddProductForm = () => {
		if (!isSubmitting) {
			setProductFormMode(null);
			setEditingProductId(null);
		}
	};

	const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const title = productForm.title.trim();
		const categoryValue = productForm.category.trim();

		if (!title) {
			setFormError("Title is required.");
			return;
		}
		if (!Number.isFinite(productForm.price) || productForm.price <= 0) {
			setFormError("Price must be a positive number.");
			return;
		}
		if (!categoryValue) {
			setFormError("Category is required.");
			return;
		}
		if (!Number.isFinite(productForm.stock) || productForm.stock < 0) {
			setFormError("Stock must be a non-negative number.");
			return;
		}

		try {
			setIsSubmitting(true);
			setFormError("");
			const payload = {
				...productForm,
				title,
				category: categoryValue,
				description: productForm.description?.trim(),
			};

			if (productFormMode === "edit" && editingProductId !== null) {
				await updateProduct(editingProductId, payload);
			} else {
				await addProduct(payload);
			}

			setProductFormMode(null);
			setEditingProductId(null);
			setProductForm(emptyProductForm);
			setSuccessMessage(
				productFormMode === "edit"
					? "Product updated successfully."
					: "Product added successfully."
			);
			setRefreshKey((currentKey) => currentKey + 1);
		} catch {
			setFormError(
				productFormMode === "edit"
					? "Unable to update the product. Please try again."
					: "Unable to add the product. Please try again."
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const confirmDeleteProduct = async () => {
		if (!deletingProduct) {
			return;
		}

		try {
			setIsDeleting(true);
			setDeleteError("");
			await deleteProduct(deletingProduct.id);

			const wasLastProductOnPage = products.length === 1;
			setProducts((currentProducts) =>
				currentProducts.filter((product) => product.id !== deletingProduct.id)
			);
			setTotal((currentTotal) => Math.max(0, currentTotal - 1));
			setDeletingProduct(null);
			setSuccessMessage("Product deleted successfully.");

			if (wasLastProductOnPage && page > 1) {
				updateUrl({ page: page - 1 });
			}
		} catch {
			setDeleteError("Unable to delete the product. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	};

	if (loading && !hasLoadedProducts) {
		return (
			<main className="flex min-h-screen items-center justify-center">
				<p className="text-lg">Loading products...</p>
			</main>
		);
	}

	return (
		<main className="min-h-screen overflow-x-hidden bg-slate-100 px-4 py-8 sm:px-6">
			<div className="mx-auto min-w-0 max-w-7xl">
				<div className="mb-8 flex items-start justify-between gap-4">
					<div className="min-w-0">
						<p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
							Inventory
						</p>
						<h1 className="break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
							Product Admin Dashboard
						</h1>
						<p className="mt-2 text-slate-600">
							Browse your product catalog and inspect each item at a glance.
						</p>
					</div>
					<button
						type="button"
						onClick={handleLogout}
						className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600"
					>
						Logout
					</button>
				</div>

				{successMessage && (
					<div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
						{successMessage}
					</div>
				)}

				{error && (
					<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						<p>{error}</p>
						<button
							type="button"
							disabled={loading}
							onClick={retryProductFetch}
							className="rounded-lg bg-slate-950 px-3 py-2 font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{loading ? "Retrying..." : "Retry"}
						</button>
					</div>
				)}

				<div className="mb-8 flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
					<label htmlFor="product-search" className="sr-only">
						Search products
					</label>
					<input
						id="product-search"
						type="search"
						value={searchInput}
						placeholder="Search products..."
						onChange={(event) => setSearchInput(event.target.value)}
						className="min-w-0 w-full flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
					/>
					<label htmlFor="category-filter" className="sr-only">
						Filter by category
					</label>
					<select
						id="category-filter"
						value={category}
						onChange={(event) =>
							updateUrl({ page: 1, category: event.target.value })
						}
						className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-auto"
					>
						<option value="">All Categories</option>
						{categories.map((availableCategory) => (
							<option key={availableCategory} value={availableCategory}>
								{availableCategory}
							</option>
						))}
					</select>
					<label htmlFor="sort-products" className="sr-only">
						Sort products
					</label>
					<select
						id="sort-products"
						value={sort}
						onChange={(event) =>
							updateUrl({
								page: 1,
								sort: event.target.value as SortValue,
							})
						}
						className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:w-auto"
					>
						{Object.entries(SORT_OPTIONS).map(([value, option]) => (
							<option key={value} value={value}>
								{option.label}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={openAddProductForm}
						className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
					>
						Add Product
					</button>
				</div>

				{loading && hasLoadedProducts && (
					<p className="mb-4 text-sm text-slate-600" role="status">
						Loading products...
					</p>
				)}

				{products.length > 0 ? (
					<div className="grid min-w-0 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{products.map((product) => {
						return (
							<article
								key={product.id}
								className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
							>
								<div className="relative flex h-56 items-center justify-center bg-slate-50 p-6">
									<img
										src={product.thumbnail}
										alt={product.title}
										className="h-full w-full object-contain mix-blend-multiply"
									/>
									<span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold capitalize text-slate-600 shadow-sm">
										{product.category}
									</span>
								</div>

								<div className="p-5">
									<div className="flex items-start justify-between gap-4">
										<h2 className="min-h-14 min-w-0 break-words text-lg font-bold leading-7 text-slate-950">
											{product.title}
										</h2>
										<p className="shrink-0 text-xl font-bold text-indigo-600">
											${product.price.toFixed(2)}
										</p>
									</div>

									<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-600">
										<span>⭐ {product.rating}</span>
										<span>{product.stock} in stock</span>
									</div>

									<button
										type="button"
										onClick={() => router.push(`/products/${product.id}?${searchParams.toString()}`)}
										className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
									>
										View details
									</button>

										<div className="mt-2 flex min-w-0 gap-2">
										<button
											type="button"
											onClick={() => openEditProductForm(product)}
											className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600"
										>
											Edit Product
										</button>
										<button
											type="button"
											onClick={() => {
												setDeleteError("");
												setDeletingProduct(product);
											}}
											className="min-w-0 flex-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
										>
											Delete
										</button>
									</div>
								</div>
							</article>
						);
					})}
					</div>
				) : (
					<div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
						<p className="text-lg font-semibold text-slate-900">No products found</p>
						<p className="mt-2 text-sm text-slate-600">
							Try adjusting your search or category filter.
						</p>
					</div>
				)}

				{products.length > 0 && (
					<div className="mt-8 flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
						<label htmlFor="page-size" className="font-medium text-slate-900">
							Items per page
						</label>
						<select
							id="page-size"
							value={limit}
							onChange={(event) =>
								updateUrl({ page: 1, limit: Number(event.target.value) })
							}
							className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
						>
							{PAGE_SIZE_OPTIONS.map((pageSize) => (
								<option key={pageSize} value={pageSize}>
									{pageSize}
								</option>
							))}
						</select>
						<span>
								Showing {firstProduct}–{lastProduct} of {total}
						</span>
					</div>

					<div className="flex min-w-0 flex-wrap items-center gap-3">
						<button
							type="button"
							disabled={page === 1}
								onClick={() => updateUrl({ page: page - 1 })}
							className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-500 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Previous
						</button>
						<span className="min-w-24 text-center text-sm font-semibold text-slate-900">
							Page {page} of {totalPages}
						</span>
						<button
							type="button"
							disabled={page >= totalPages}
								onClick={() => updateUrl({ page: page + 1 })}
							className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Next
						</button>
					</div>
					</div>
				)}
			</div>

			{productFormMode && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8"
					role="presentation"
					onMouseDown={(event) => {
						if (event.target === event.currentTarget) closeAddProductForm();
					}}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="add-product-title"
						className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
					>
						<div className="mb-6 flex items-start justify-between gap-4">
							<div>
								<h2
									id="add-product-title"
									className="text-2xl font-bold text-slate-950"
								>
									{productFormMode === "edit" ? "Edit Product" : "Add Product"}
								</h2>
								<p className="mt-1 text-sm text-slate-600">
									{productFormMode === "edit"
										? "Update this item in your product catalog."
										: "Add a new item to your product catalog."}
								</p>
							</div>
							<button
								type="button"
								onClick={closeAddProductForm}
								disabled={isSubmitting}
								aria-label="Close add product form"
								className="rounded-lg px-3 py-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
							>
								&times;
							</button>
						</div>

						<form className="space-y-4" onSubmit={submitProduct}>
							<div>
								<label htmlFor="product-title" className="mb-1 block text-sm font-semibold text-slate-900">
									Title <span className="text-rose-500">*</span>
								</label>
								<input
									id="product-title"
									required
									value={productForm.title}
									onChange={(event) =>
										setProductForm({ ...productForm, title: event.target.value })
									}
									className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label htmlFor="product-price" className="mb-1 block text-sm font-semibold text-slate-900">
										Price <span className="text-rose-500">*</span>
									</label>
									<input
										id="product-price"
										type="number"
										min="0.01"
										step="0.01"
										required
										value={productForm.price || ""}
										onChange={(event) =>
											setProductForm({
												...productForm,
												price: Number(event.target.value),
											})
										}
										className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
									/>
								</div>

								<div>
									<label htmlFor="product-stock" className="mb-1 block text-sm font-semibold text-slate-900">
										Stock <span className="text-rose-500">*</span>
									</label>
									<input
										id="product-stock"
										type="number"
										min="0"
										step="1"
										required
										value={productForm.stock}
										onChange={(event) =>
											setProductForm({
												...productForm,
												stock: Number(event.target.value),
											})
										}
										className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
									/>
								</div>
							</div>

							<div>
								<label htmlFor="product-category" className="mb-1 block text-sm font-semibold text-slate-900">
									Category <span className="text-rose-500">*</span>
								</label>
								<select
									id="product-category"
									required
									value={productForm.category}
									onChange={(event) =>
										setProductForm({ ...productForm, category: event.target.value })
									}
									className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
								>
									<option value="">Select a category</option>
									{categories.map((availableCategory) => (
										<option key={availableCategory} value={availableCategory}>
											{availableCategory}
										</option>
									))}
								</select>
							</div>

							<div>
								<label htmlFor="product-description" className="mb-1 block text-sm font-semibold text-slate-900">
									Description <span className="font-normal text-slate-500">(optional)</span>
								</label>
								<textarea
									id="product-description"
									rows={3}
									value={productForm.description}
									onChange={(event) =>
										setProductForm({ ...productForm, description: event.target.value })
									}
									className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
								/>
							</div>

							{formError && (
								<p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
									{formError}
								</p>
							)}

							<div className="flex justify-end gap-3 pt-2">
								<button
									type="button"
									onClick={closeAddProductForm}
									disabled={isSubmitting}
									className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{isSubmitting
										? productFormMode === "edit"
											? "Updating product..."
											: "Adding product..."
										: productFormMode === "edit"
											? "Update Product"
											: "Add Product"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{deletingProduct && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
					role="presentation"
					onMouseDown={(event) => {
						if (!isDeleting && event.target === event.currentTarget) {
							setDeletingProduct(null);
						}
					}}
				>
					<div
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="delete-product-title"
						className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
					>
						<h2
							id="delete-product-title"
							className="text-xl font-bold text-slate-950"
						>
							Delete Product
						</h2>
						<p className="mt-3 text-slate-600">
							Are you sure you want to delete this product?
						</p>
						{deleteError && (
							<p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
								{deleteError}
							</p>
						)}
						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								disabled={isDeleting}
								onClick={() => setDeletingProduct(null)}
								className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={isDeleting}
								onClick={confirmDeleteProduct}
								className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

export default function ProductsPage() {
	return (
		<Suspense
			fallback={
				<main className="flex min-h-screen items-center justify-center">
					<p className="text-lg">Loading products...</p>
				</main>
			}
		>
			<ProductsPageContent />
		</Suspense>
	);
}