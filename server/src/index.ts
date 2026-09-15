import http from 'node:http';

/** Bootstrap entry (T-02). Routing and storage land in T-24. */
export function createServer() {
  const server = http.createServer((_req, res) => {
    res.writeHead(404, { 'content-type': 'application/problem+json' });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Not Found', status: 404 }));
  });
  return {
    listen(port: number): Promise<number> {
      return new Promise((resolve) => {
        server.listen(port, '127.0.0.1', () => {
          const a = server.address();
          resolve(typeof a === 'object' && a ? a.port : port);
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
