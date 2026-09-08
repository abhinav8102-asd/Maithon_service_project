import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'providers',
        loadComponent: () => import('./features/providers/providers').then(m => m.ProvidersComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/categories').then(m => m.CategoriesComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./features/services/services').then(m => m.ServicesComponent)
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./features/subscriptions/subscriptions').then(m => m.SubscriptionsComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./features/bookings/bookings').then(m => m.BookingsComponent)
      },
      {
        path: 'support',
        loadComponent: () => import('./features/support/support').then(m => m.SupportComponent)
      },
      {
        path: 'chats',
        loadComponent: () => import('./features/chats/chats').then(m => m.ChatsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings').then(m => m.SettingsComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
