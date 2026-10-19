import { Routes } from '@angular/router';
import { authGuard, authChildGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    loadComponent: () => import('./layouts/app-layout/app-layout').then(m => m.AppLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products/create',
        loadComponent: () => import('./features/products/product-form/product-form').then(m => m.ProductForm),
        data: {
          mode: 'create',
          pageTitle: 'New product',
          pageSubtitle: 'Enter the details for your new product.',
        },
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products').then(m => m.Products),
        data: {
          pageTitle: 'Products',
          pageSubtitle: 'View and manage your products.',
        },
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/my-profile/my-profile').then(m => m.MyProfile),
        data: {
          pageTitle: 'My Profile',
          pageSubtitle: 'View your account information.',
        },
      },
    ],
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth-layout/auth-layout').then(m => m.AuthLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
      },
    ],
  },
];
