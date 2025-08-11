import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TransactionsComponent } from './components/transactions/transactions.component';


export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'transactions', component: TransactionsComponent },

  { path: 'budgets', component: DashboardComponent }, // Placeholder
  { path: 'goals', component: DashboardComponent }, // Placeholder
  { path: 'reports', component: DashboardComponent }, // Placeholder
];
