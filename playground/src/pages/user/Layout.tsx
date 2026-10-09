// @route-parent-id: null

import { Outlet, redirect } from 'react-router';

export const loader = () => {
  throw redirect('/admin');
};

export default function UserLayout() {
  return (
    <div>
      <h1>UserLayout</h1>
      <p>This is UserLayout</p>
      <Outlet />
    </div>
  );
}
