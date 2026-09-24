import api from "./axios";

export interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  rating: number;
  stock: number;
  thumbnail: string;
  description?: string;
  images?: string[];
  reviews?: ProductReview[];
}

export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface NewProduct {
  title: string;
  price: number;
  category: string;
  stock: number;
  description?: string;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export type ProductSortBy = "title" | "price" | "rating" | "stock";
export type ProductSortOrder = "asc" | "desc";

export interface ProductListOptions {
  signal?: AbortSignal;
  sortBy?: ProductSortBy;
  order?: ProductSortOrder;
}

export const getProducts = async (
  limit: number,
  skip: number,
  options?: ProductListOptions
): Promise<ProductResponse> => {
  const response = await api.get<ProductResponse>("/products", {
    params: {
      limit,
      skip,
      sortBy: options?.sortBy,
      order: options?.order,
    },
    signal: options?.signal,
  });

  return response.data;
};

export const searchProducts = async (
  query: string,
  limit: number,
  skip: number,
  signal?: AbortSignal,
  options?: Omit<ProductListOptions, "signal">
): Promise<ProductResponse> => {
  const response = await api.get<ProductResponse>("/products/search", {
    params: {
      q: query,
      limit,
      skip,
      sortBy: options?.sortBy,
      order: options?.order,
    },
    signal,
  });

  return response.data;
};

export const getProductsByCategory = async (
  category: string,
  limit: number,
  skip: number,
  options?: ProductListOptions
): Promise<ProductResponse> => {
  const response = await api.get<ProductResponse>(
    `/products/category/${encodeURIComponent(category)}`,
    {
      params: {
        limit,
        skip,
        sortBy: options?.sortBy,
        order: options?.order,
      },
      signal: options?.signal,
    }
  );

  return response.data;
};

export const getProductCategories = async (): Promise<string[]> => {
  const response = await api.get<string[]>("/products/category-list");

  return response.data;
};

export const addProduct = async (product: NewProduct): Promise<Product> => {
  const response = await api.post<Product>("/products/add", product);

  return response.data;
};

export const updateProduct = async (
  id: number,
  product: NewProduct
): Promise<Product> => {
  const response = await api.patch<Product>(`/products/${id}`, product);

  return response.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
	await api.delete(`/products/${id}`);
};

export const getProduct = async (id: string): Promise<Product> => {
  const response = await api.get<Product>(`/products/${encodeURIComponent(id)}`);

  return response.data;
};