import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../interfaces';
import { TransactionType } from '../../enums';
import { formatCurrency, formatRelativeDate } from '../../utils/formatting.utils';
import { CustomDropdownComponent, DropdownOption } from '../shared/custom-dropdown/custom-dropdown.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, CustomDropdownComponent],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  transactions: Transaction[] = [];
  totalIncome = 0;
  totalExpenses = 0;
  balance = 0;
  selectedTimePeriod: string = 'This Month';

  // Dropdown options
  timePeriodOptions: DropdownOption[] = [
    { value: 'This Month', label: 'This Month' },
    { value: 'Last Month', label: 'Last Month' },
    { value: 'Last 3 Months', label: 'Last 3 Months' }
  ];

  constructor(
    // eslint-disable-next-line no-unused-vars
    private transactionService: TransactionService
  ) {}

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
