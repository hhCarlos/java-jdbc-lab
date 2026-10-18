import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
  {
    path: 'app',
    loadComponent: () => import('./layouts/app-layout/app-layout').then(m => m.AppLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products').then(m => m.Products),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/my-profile/my-profile').then(m => m.MyProfile),
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
