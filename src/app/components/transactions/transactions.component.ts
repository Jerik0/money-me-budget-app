import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecurrenceFrequency, ProjectionInterval, TransactionType, ProjectionType } from '../../enums';
import { BalanceProjectionChartComponent } from '../balance-projection-chart/balance-projection-chart.component';
import { Transaction, ProjectionPoint, TimelineItem } from '../../interfaces';
import { TransactionService } from '../../services/transaction.service';
import { StorageService } from '../../services/storage.service';
import { TimelineService } from '../../services/timeline.service';





@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, BalanceProjectionChartComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  @ViewChild('descriptionInput') descriptionInput!: ElementRef;
  
  currentBalance: number = 0;
  lastBalanceUpdate: Date = new Date();
  transactions: Transaction[] = [];
  timeline: (TimelineItem | ProjectionPoint)[] = [];
  projectionInterval: ProjectionInterval = ProjectionInterval.MONTHLY;
  lowestProjections: ProjectionPoint[] = [];
  groupedTransactions: { date: Date, transactions: TimelineItem[] }[] = [];
  
  newRecurringTransaction: Partial<Transaction> = {
    description: '',
    amount: 0,
    type: TransactionType.EXPENSE,
    category: '',
    isRecurring: true,
    recurringPattern: {
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      lastDayOfMonth: false,
      lastWeekdayOfMonth: false
    }
  };

  showAddForm = false;
  isEditingBalance = false;
  componentInitialized = false;
  
  // View mode toggle: 'grid' for current card view, 'list' for compact list view
  viewMode: 'grid' | 'list' = 'grid';

  constructor(
    private transactionService: TransactionService,
    private storageService: StorageService,
    private timelineService: TimelineService
  ) {}

  ngOnInit() {
    this.loadTransactions();
    this.addSampleData();
    this.calculateTimeline();
    // Set initialization flag after a brief delay to allow component to settle
    setTimeout(() => {
      this.componentInitialized = true;
    }, 50);
  }

  updateBalance() {
    this.lastBalanceUpdate = new Date();
    this.calculateTimeline();
  }

  toggleAddForm() {
    if (this.showAddForm) {
      // If form is open and we're closing it (canceling), clear the form
      this.resetForm();
      this.showAddForm = false;
    } else {
      // If form is closed and we're opening it
      this.showAddForm = true;
      // Auto-focus the description input after the animation completes
      setTimeout(() => {
        if (this.descriptionInput) {
          this.descriptionInput.nativeElement.focus();
        }
      }, 550); // Slightly after the 500ms transition
    }
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    // No additional calculations needed - view switching is now instant
  }

  addRecurringTransaction() {
    if (!this.newRecurringTransaction.description || !this.newRecurringTransaction.amount) {
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      date: new Date(),
      description: this.newRecurringTransaction.description!,
      amount: this.newRecurringTransaction.amount!,
      type: this.newRecurringTransaction.type!,
      category: this.newRecurringTransaction.category!,
      isRecurring: true,
      recurringPattern: this.newRecurringTransaction.recurringPattern!
    };

    this.transactions.push(transaction);
    this.calculateTimeline();
    this.resetForm();
    
    // Slide form back after successful addition
    this.showAddForm = false;
  }

  onLastDayOptionChange(option: 'lastDay' | 'lastWeekday', event: Event) {
    const target = event.target as HTMLInputElement;
    const isChecked = target.checked;

    if (option === 'lastDay') {
      this.newRecurringTransaction.recurringPattern!.lastDayOfMonth = isChecked;
      if (isChecked) {
        // Uncheck the other option (mutual exclusivity)
        this.newRecurringTransaction.recurringPattern!.lastWeekdayOfMonth = false;
      }
    } else if (option === 'lastWeekday') {
      this.newRecurringTransaction.recurringPattern!.lastWeekdayOfMonth = isChecked;
      if (isChecked) {
        // Uncheck the other option (mutual exclusivity)
        this.newRecurringTransaction.recurringPattern!.lastDayOfMonth = false;
      }
    }
  }

  private resetForm() {
    this.newRecurringTransaction = {
      description: '',
      amount: 0,
      type: TransactionType.EXPENSE,
      category: '',
      isRecurring: true,
      recurringPattern: {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        lastDayOfMonth: false,
        lastWeekdayOfMonth: false
      }
    };
  }

  private loadTransactions() {
    this.transactions = this.storageService.loadTransactions();
    this.currentBalance = this.storageService.loadCurrentBalance();
  }

  private saveTransactions() {
    this.storageService.saveTransactions(this.transactions);
    this.storageService.saveCurrentBalance(this.currentBalance);
  }

  calculateTimeline() {
    this.timeline = this.timelineService.calculateTimeline(
      this.transactions,
      this.currentBalance,
      this.projectionInterval
    );
    this.saveTransactions();
    this.updateLowestProjections();
    this.updateGroupedTransactions();
  }

  deleteTransaction(id: string) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.calculateTimeline();
  }

  isTransaction(item: any): item is TimelineItem {
    return this.timelineService.isTransaction(item);
  }

  isProjectionPoint(item: any): item is ProjectionPoint {
    return this.timelineService.isProjectionPoint(item);
  }

  trackByDate(index: number, item: any): string {
    return item.date.toISOString();
  }

  private updateLowestProjections(): void {
    this.lowestProjections = this.timelineService.calculateLowestProjections(
      this.timeline,
      this.currentBalance,
      this.projectionInterval
    );
  }

  getLowestProjections(): ProjectionPoint[] {
    return this.lowestProjections;
  }

  // Expose enums to template
  get RecurrenceFrequency() { return RecurrenceFrequency; }
  get ProjectionInterval() { return ProjectionInterval; }
  get TransactionType() { return TransactionType; }



  onProjectionIntervalChange(interval: ProjectionInterval) {
    this.projectionInterval = interval;
    this.calculateTimeline();
  }

  private updateGroupedTransactions(): void {
    this.groupedTransactions = this.timelineService.groupTransactionsByDate(this.timeline);
  }

  getGroupedTransactions(): { date: Date, transactions: TimelineItem[] }[] {
    return this.groupedTransactions;
  }

  // Helper method for debugging - clears localStorage and reloads sample data
  clearDataAndReload() {
    this.storageService.clearAllData();
    this.transactions = [];
    this.currentBalance = 0;
    this.loadTransactions();
    this.addSampleData();
    this.calculateTimeline();
    console.log('Data cleared and sample data reloaded');
  }

  private addSampleData() {
    // Only add sample data if no transactions exist and no data in localStorage
    if (this.transactions.length === 0 && !this.storageService.hasExistingData()) {
      console.log('Adding sample data - no existing transactions found');
      // Set a starting balance
      this.currentBalance = 3250.00;
      
      // Get sample transactions from the service
      this.transactions = this.transactionService.getSampleTransactionsData();
      this.saveTransactions();
    }
  }

}
