/**
 * Client API Helper cho DATASOFT
 */

let currentAuthToken = localStorage.getItem('datasoft_token') || '';

export function setAuthToken(token: string) {
  currentAuthToken = token;
  if (token) {
    localStorage.setItem('datasoft_token', token);
  } else {
    localStorage.removeItem('datasoft_token');
  }
}

export function getAuthToken(): string {
  return currentAuthToken;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = `Lỗi máy chủ (${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<T>;
}

export function formatVND(amount: number): string {
  return (amount || 0).toLocaleString('vi-VN') + ' đ';
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatDateOnly(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
