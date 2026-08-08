# Fix false "Data tidak valid" after successful CRUD

Changes:
- Material create/update/delete no longer reports an error after the row was already changed.
- Audit-log failures are logged on the API server and no longer replace a successful business response with a validation error.
- Material writes and their normal audit operation run in a database transaction.
- Frontend save/delete success is separated from the subsequent list refresh.
- A failed refresh is logged to the browser console and does not claim that the write failed.
- DELETE requests no longer send an unnecessary JSON Content-Type header when there is no body.
- Successful create/update/delete messages are translated in English, Indonesian, and Korean.

After replacing the files, restart both API and frontend development servers.
