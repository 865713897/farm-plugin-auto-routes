import { createBrowserRouter, RouterProvider } from 'react-router';
import routes from 'virtual:routes';

export default function AppRouter() {
  const router = createBrowserRouter(routes);

  return <RouterProvider router={router} />;
}
