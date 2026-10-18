# Front end

Empty Angular 21 application using standalone components, SCSS, and client-side routing.

From the repository root, start the Spring Boot backend separately in its own
terminal, with the development environment configured as described in the root
[README](../README.md):

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The backend must remain running at `http://localhost:8080` (the default port
documented in the root README). Starting Angular does not start the backend.

In another terminal, use Node.js 24 and npm from the repository root:

```bash
cd front-end
nvm use
npm ci
npm start
```

Open http://localhost:4200/.

`npm start` runs `ng serve`, which automatically loads `proxy.conf.json` through
the `serve.options.proxyConfig` setting in `angular.json`. The Angular 21
`@angular/build:dev-server` builder uses Vite path matching: `/api/**` matches
nested API paths. Its proxy loader supports the JSON `pathRewrite` option used
here to remove `/api` before forwarding, preserving the rest of the URL.

For example, `http://localhost:4200/api/auth/register` forwards to
`http://localhost:8080/auth/register`. Only API-prefixed requests are proxied;
Angular page routes such as `/auth` and `/app` remain frontend routes.

With the backend running, a harmless public catalog request can check forwarding:

```bash
curl http://localhost:4200/api/catalog/products
```

Restart `npm start` after editing the proxy configuration. This proxy applies
only to the development server; production hosting needs its own routing setup.

```bash
npm run build
npm test -- --watch=false
```

Production output is written to `dist/front-end/browser/`.
