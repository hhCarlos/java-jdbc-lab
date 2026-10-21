# Java JDBC Lab frontend

Angular UI for the Java/JDBC laboratory: registration, login, owner product listing,
creation, editing, publication controls, and soft deletion. The authenticated profile
route exists, but its view is currently empty.
The application uses standalone components, lazy routes, SCSS, shared controls,
notifications, and a blocking loader. Sessions are held in memory and cleared on
page reload or token expiration.

## Requirements and installation

The project declares Angular `^21.2.0`, Angular CLI/build `^21.2.27`, TypeScript
`~5.9.2`, Node.js 24 in [.nvmrc](.nvmrc), and npm 11.16.0 in
[package.json](package.json). The lockfile pins the installed dependency graph.
CI and the Docker build select Node 24; the Dockerfile does not separately pin npm.
These are repository declarations, not runtime verification from this documentation task.

Start the backend at `http://localhost:8080` using the environment and database
instructions in the [root README](../README.md#local-development). Starting Angular
does not start or initialize the backend.

From the repository root, in a separate terminal:

```sh
cd front-end
nvm use
npm ci
npm start
```

`nvm use` requires nvm and an installed Node 24; omit it if Node 24 is already selected.
Use the declared npm version. Open <http://localhost:4200> (login route: `/auth/login`).
Stop the server with Ctrl+C.

## Development API proxy

[angular.json](angular.json) loads [proxy.conf.json](proxy.conf.json) for `ng serve`.
Requests matching `/api/**` go to `http://localhost:8080` with `/api` removed:
`/api/auth/register` becomes `/auth/register`. Page routes under `/auth` and `/app`
remain frontend routes. The backend must be running and its schema initialized.

With both servers running, check public catalog forwarding:

```sh
curl --fail http://localhost:4200/api/catalog/products
```

Restart `npm start` after changing the proxy. The development proxy is not part of
the production build; production hosting needs API routing and SPA fallback.
The [complete Docker demo](../README.md#disposable-docker-demo) supplies these through Nginx.

## Tests and production build

Run from `front-end/`:

```sh
npm test -- --watch=false
npm run build
```

Tests use Angular's unit-test builder with Vitest/jsdom and do not require a browser
or running backend. `npm test` starts the default interactive test mode.
`npm run build` selects the default production configuration and writes browser
assets to `dist/front-end/browser/`. `npm run watch` builds continuously with the
development configuration. See [CI](../.github/workflows/backend-tests.yml) for
its JUnit reporting flags; coverage reporting is not configured.

## Organization

```text
src/
  app/
    app.routes.ts           Lazy routes and authentication guards
    features/
      auth/                 Login/register, session service, interceptor, guards, models
      my-profile/           Profile route placeholder (empty view)
      products/             Listing, product form, service, and models
    layouts/
      app-layout/           Authenticated shell, notifications and notification service
      app-sidebar/          Navigation
    shared/                 Buttons, inputs, icons, table, modal, loader, page header
  styles.scss               Global style entry point
  styles/
    abstracts/              Tokens and breakpoints
    base/                   Reset, document, typography and utilities
    themes/                 Light and dark themes
public/                     Static assets
```

Services and models are colocated with their owning feature or component; there
are no global `services/` or `models/` directories. See [styles documentation](src/styles/README.md)
and the [architecture overview](../docs/architecture/README.md) for design boundaries.
