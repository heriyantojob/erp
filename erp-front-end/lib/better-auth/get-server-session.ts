// lib/better-auth/get-server-session.ts
import { cookies } from 'next/headers';
import { authClient } from './auth-client';

export async function getServerSession() {
  const cookieStore = await cookies();

  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: {
        Cookie: cookieStore.toString(), // forward semua cookie apa adanya
      },
    },
  });

  return session; // null kalau tidak login
}