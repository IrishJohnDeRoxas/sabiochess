# Sabiochess

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Browser Extension (Chess.com Integration)

The `extension/` directory contains the official Manifest V3 Chrome extension.

### Dev Testing on Chess.com:
By default, the extension loads `https://sabiochess.com`. To point it to your local dev server while testing on Chess.com, open the browser console (`Cmd+Option+I` on chess.com) and run:

```javascript
// Point to local development:
localStorage.setItem('sabiochess_target_url', 'http://localhost:4200');

// Reset to production:
localStorage.removeItem('sabiochess_target_url');
```

---

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
