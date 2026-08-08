# ERP System

## Technology Stack

* **Backend:** Express.js 5
* **Frontend:** Next.js 16
* **Database:** PostgreSQL

> **Note:** The backend API is built with Express.js 5, the frontend application uses Next.js 16, and PostgreSQL is used as the primary relational database.

---

## Installation

### 1. Backend / API

Navigate to the `erp-api` directory:

```bash id="c4t2un"
cd erp-api
```

Install dependencies:

```bash id="p74xvb"
npm install
```

Generate the required files:

```bash id="njs1rb"
npm run generate
```

Run database migrations:

```bash id="gx1hrf"
npm run migrate
```

Run the API in development mode:

```bash id="9h4r7x"
npm run dev
```

---

### 2. Frontend

Navigate to the `erp-front-end` directory:

```bash id="7z2kmd"
cd erp-front-end
```

Install dependencies:

```bash id="6m2w9f"
npm install
```

Run the frontend in development mode:

```bash id="8k3qva"
npm run dev
```

---

## Demo User Accounts

The following accounts are provided for testing and assessment purposes.

| Role                      | Email                 | Password   |
| ------------------------- | --------------------- | ---------- |
| **System Administrator**  | `admin@erp.test`      | `1234asdf` |
| **Warehouse User**        | `warehouse@erp.test`  | `asdf1234` |
| **Production User**       | `production@erp.test` | `asdf1234` |
| **Supervisor / Approver** | `approver@erp.test`   | `asdf1234` |
| **Management / Auditor**  | `auditor@erp.test`    | `asdf1234` |

> **Security Notice:** These accounts are intended for demonstration and assessment purposes only. Change the passwords or remove the accounts before deploying the application to production.

---

## Quick Installation

### Backend

```bash id="g7f3kd"
cd erp-api
npm install
npm run generate
npm run migrate
npm run dev
```

### Frontend

Open a new terminal:

```bash id="p9v2mx"
cd erp-front-end
npm install
npm run dev
```

> **Development Note:** Run the backend and frontend in separate terminal sessions. Make sure PostgreSQL is running and the backend database connection is properly configured before running migrations.
