import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div>
      <p>This is Manage Layout</p>
      <Outlet />
    </div>
  );
}
