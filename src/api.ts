let csrf = '';
export function setCsrf(token: string) {
  csrf = token;
}
export async function request(route: string, data?: unknown) {
  const response = await fetch(
    '/api' + route,
    data === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Album-Cards': csrf },
          body: JSON.stringify(data),
        },
  );
  if (!response.ok) {
    const value = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(value.error);
  }
  return response;
}
export async function api(route: string, data?: unknown) {
  return (await request(route, data)).json();
}
