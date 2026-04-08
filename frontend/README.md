# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Full-stack overview

- The React UI in this directory relies on a new `backend/` service that implements the ERD from the project proposal using Express, Prisma, and PostgreSQL. See [backend/README.md](../backend/README.md) for detailed setup and API documentation.
- To run locally, start the backend first (`cd backend && npm run dev`) so the API is available, then run the frontend (`cd frontend && npm install && npm run dev`).
- The backend helpers in `src/services/api.js` plan for future integration with these endpoints, so UI components can gradually replace their stub data with live responses.
