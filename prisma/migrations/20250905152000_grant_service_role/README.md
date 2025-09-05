Grant privileges to `service_role` on the tables used by the app (`waitlist`, `jobs`).
This ensures server-side operations with the service key do not hit permission denied errors.

