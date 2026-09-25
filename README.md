Product Admin Dashboard

A responsive Product Admin Dashboard built with Next.js, React, TypeScript, Tailwind CSS, and Axios, using the free DummyJSON API.

The application provides authentication, product management, search, filtering, sorting, pagination, product details, and responsive layouts for desktop and mobile devices.

Live Demo

https://product-admin-dashboard-dusky-three.vercel.app

GitHub Repository

https://github.com/akshaykanade1418/product-admin-dashboard

Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios
- DummyJSON API

Features

Authentication

- Login using DummyJSON authentication API
- Demo credentials:
  - Username: "emilys"
  - Password: "emilyspass"
- Authentication token stored in localStorage
- Protected product pages
- Logout functionality
- Error handling for invalid login details
- Prevents duplicate login submissions

Product Dashboard

- Product list with:
  - Product image
  - Title
  - Category
  - Price
  - Rating
  - Stock
- Responsive table/card layout
- Loading states
- Empty states
- API error handling with Retry option

Search and Filtering

- Product search using DummyJSON search API
- Debounced search input
- Category filtering
- Search and category filtering work together
- Search resets pagination to page 1

Sorting

Products can be sorted by:

- Price
- Rating
- Title

Pagination

- Page numbers
- Previous and Next buttons
- Page size options:
  - 10
  - 20
  - 50
- Displays the current product range and total count

Product Details

- Dynamic product detail page
- Product images
- Description
- Price
- Rating
- Reviews
- Handles invalid product IDs

Product Management

- Add product
- Edit product
- Delete product
- Form validation
- Delete confirmation
- Duplicate save prevention

«Note: DummyJSON simulates product creation, updating, and deletion. These operations are therefore not permanently stored on the DummyJSON server.»

URL State

Search, category, sorting, page, and page-size values are maintained in the URL so the current dashboard state can be shared or refreshed.

Responsive Design

The dashboard is designed to work across:

- Desktop
- Tablet
- Mobile

Project Structure

product-admin-dashboard/
│
├── app/
│   ├── products/
│   │   ├── [id]/
│   │   └── page.tsx
│   │
│   └── ...
│
├── lib/
│   └── api/
│       ├── axios.ts
│       ├── auth.ts
│       └── products.ts
│
├── public/
├── package.json
├── README.md
└── ...

API

The project uses the free DummyJSON API.

Main endpoints used include:

POST /auth/login
GET  /products
GET  /products/search?q=
GET  /products/categories
GET  /products/{id}
POST /products/add
PUT  /products/{id}
DELETE /products/{id}

Getting Started

1. Clone the repository

git clone https://github.com/akshaykanade1418/product-admin-dashboard.git

2. Open the project

cd product-admin-dashboard

3. Install dependencies

npm install

4. Run the development server

npm run dev

Open:

http://localhost:3000

5. Login

Use the demo credentials:

Username: emilys
Password: emilyspass

Production Build

To check the production build locally:

npm run build

To start the production server:

npm start

Technical Decisions

Axios

Axios is used for API communication. A shared Axios instance is used to keep API configuration centralized and automatically attach the authentication token to requests.

URL Parameters

Dashboard state such as search, category, sorting, pagination, and page size is maintained through URL parameters.

Debounced Search

Search input is debounced so API requests are not sent for every individual keystroke.

Stale Search Handling

Search requests are handled carefully so an older API response does not incorrectly replace newer search results.

Component Structure

The application is divided into smaller components and API calls are kept in separate files to make the code easier to maintain.

Challenges and Solutions

Next.js Production Build

During Vercel deployment, the "/products" page initially failed because "useSearchParams()" needed to be used inside a React Suspense boundary.

The component structure was updated to make the page compatible with the Next.js production build.

Search Performance

Rapid search input could trigger unnecessary requests and cause stale results. Debouncing and stale-response handling were implemented.

URL State

Invalid or missing URL values are handled safely so the dashboard can continue working with valid default values.

DummyJSON CRUD

DummyJSON provides simulated product creation, update, and deletion responses. Therefore, CRUD changes are not intended to persist permanently on the server.

Completed Assignment Requirements

- [x] Next.js + React + TypeScript
- [x] Tailwind CSS
- [x] Axios API setup
- [x] DummyJSON authentication
- [x] Protected product pages
- [x] Logout
- [x] Product listing
- [x] Pagination
- [x] Page-size selection
- [x] Product search
- [x] Category filtering
- [x] Sorting
- [x] Product details
- [x] Add product
- [x] Edit product
- [x] Delete product
- [x] Validation
- [x] Loading state
- [x] Error state
- [x] Empty state
- [x] Retry functionality
- [x] Debounced search
- [x] Stale search response handling
- [x] URL state
- [x] Invalid URL value handling
- [x] Responsive design
- [x] GitHub repository
- [x] Vercel deployment

AI Assistance

AI tools were used during development for debugging, implementation assistance, and resolving development/build issues. The final project was reviewed and tested to ensure the implemented features work as required.
