import { Outlet } from 'react-router';

export default function Layout() {
  return (
    <div>
      <p>This is Global Layout</p>
      <Outlet />
    </div>
  );
}
