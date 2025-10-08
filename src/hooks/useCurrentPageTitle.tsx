import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/invoices': 'Invoices',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
  '/admin': 'Business Administration',
};

export const useCurrentPageTitle = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Handle admin sub-routes
  if (currentPath.startsWith('/admin')) {
    return 'Business Administration';
  }
  
  return routeTitles[currentPath] || 'Page';
};

