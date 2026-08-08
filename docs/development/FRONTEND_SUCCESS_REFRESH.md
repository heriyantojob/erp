# Frontend Success Message and Refresh

Every frontend mutation now follows the same flow:

1. Send create, update, delete, post, or reversal request.
2. Show a localized success notification after the API confirms success.
3. Refresh the affected list or stock data.
4. Keep the success notification visible when refresh fails, while showing a separate refresh warning.

Covered screens:
- Materials
- Business Partners
- Goods Receipts CRUD
- Bill of Materials
- User Management
- Stock Goods Receipt
- Material Issue
- Stock Transaction Reversal

Supported locales: English (`en`), Indonesian (`id`), and Korean (`ko`).
