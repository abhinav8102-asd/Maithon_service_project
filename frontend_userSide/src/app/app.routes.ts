import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent)
  },
  {
    path: 'customer',
    canActivate: [authGuard, roleGuard(['Customer'])],
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./features/customer/profile/profile').then(m => m.CustomerProfileComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/customer/bookings/bookings').then(m => m.CustomerBookingsComponent)
      },
      {
        path: 'favorites',
        loadComponent: () => import('./features/customer/favorites/favorites').then(m => m.CustomerFavoritesComponent)
      }
    ]
  },
  {
    path: 'provider',
    canActivate: [authGuard, roleGuard(['Provider'])],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/provider/dashboard/dashboard').then(m => m.ProviderDashboardComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/provider/profile/profile').then(m => m.ProviderProfileComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/provider/bookings/bookings').then(m => m.ProviderBookingsComponent)
      },
      {
        path: 'kyc',
        loadComponent: () => import('./features/provider/kyc/kyc').then(m => m.ProviderKycComponent)
      }
    ]
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./features/home/policy').then(m => m.PolicyComponent)
  },
  {
    path: 'terms-conditions',
    loadComponent: () => import('./features/home/policy').then(m => m.PolicyComponent)
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chat/chat').then(m => m.ChatComponent)
  },
  {
    path: 'chat/:partnerId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chat/chat').then(m => m.ChatComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
