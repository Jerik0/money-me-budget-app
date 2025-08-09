import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../interfaces';
import { TransactionType } from '../../enums';
import { formatCurrency, formatRelativeDate } from '../../utils/formatting.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  transactions: Transaction[] = [];
  totalIncome = 0;
  totalExpenses = 0;
  balance = 0;

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.transactionService.getTransactions().subscribe((transactions: Transaction[]) => {
      this.transactions = transactions;
      this.totalIncome = this.transactionService.getTotalIncome();
      this.totalExpenses = this.transactionService.getTotalExpenses();
      this.balance = this.transactionService.getBalance();
    });
  }

  getRecentTransactions(): Transaction[] {
    return this.transactionService.getRecentTransactions(4);
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  formatDate(date: Date): string {
    return formatRelativeDate(date);
  }

  // Expose enum to template
  get TransactionType() {
    return TransactionType;
  }
}
