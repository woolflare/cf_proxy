export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const proxyUrl = url.searchParams.get('url');
      const modify = url.searchParams.has('modify');
      const maxRedirects = 5;
      let currentRedirects = 0;

      if (!proxyUrl) {
        const exampleUrl = `${url.origin}/?url=https://example.com`;
        return new Response(`Bad request: Missing 'url' query param. Example: ${exampleUrl}`, { status: 400 });
      }

      if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
        return new Response('Bad request: URL must start with http:// or https://', { status: 400 });
      }

      let response = await fetch(proxyUrl, request);

      while ((response.status === 301 || response.status === 302) && currentRedirects < maxRedirects) {
        const newUrl = response.headers.get('Location');
        if (newUrl === null) {
          return new Response(`Redirect location is null, unable to continue.`, { status: 500 });
        }
        response = await fetch(newUrl, request);
        currentRedirects++;
      }

      if (currentRedirects >= maxRedirects) {
        return new Response(`Too many redirects`, { status: 500 });
      }

      if (!response.ok) {
        return new Response(`Proxy error: Unable to fetch ${proxyUrl}. Status: ${response.status}`, { status: response.status });
      }

      if (modify) {
        let modifiedHeaders = new Headers(response.headers);
        modifiedHeaders.set('Access-Control-Allow-Origin', '*');
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: modifiedHeaders
        });
      }

      return response;
    } catch (error) {
      return new Response('Server error: ' + error.message, { status: 500 });
    }
  },
};
