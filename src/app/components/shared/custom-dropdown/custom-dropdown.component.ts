import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DropdownOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-custom-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-dropdown.component.html',
  styleUrls: ['./custom-dropdown.component.scss']
})
export class CustomDropdownComponent implements OnInit, OnChanges {
  @Input() options: DropdownOption[] = [];
  @Input() selectedValue: any;
  @Input() placeholder: string = 'Select an option';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'outline' | 'filled' = 'outline';
  @Input() disabled: boolean = false;
  
  @Output() selectedValueChange = new EventEmitter<any>();
  @Output() valueChange = new EventEmitter<any>();

  isOpen = false;
  selectedLabel: string = '';

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.updateSelectedLabel();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedValue'] || changes['options']) {
      this.updateSelectedLabel();
    }
  }

  updateSelectedLabel() {
    if (this.selectedValue && this.options.length > 0) {
      const option = this.options.find(opt => opt.value === this.selectedValue);
      this.selectedLabel = option ? option.label : this.placeholder;
    } else {
      this.selectedLabel = this.placeholder;
    }
  }

  toggleDropdown() {
    if (!this.disabled) {
      this.isOpen = !this.isOpen;
    }
  }

  closeDropdown() {
    this.isOpen = false;
  }

  selectOption(option: DropdownOption) {
    this.selectedValue = option.value;
    this.selectedLabel = option.label;
    this.selectedValueChange.emit(this.selectedValue);
    this.valueChange.emit(this.selectedValue);
    this.closeDropdown();
  }

  getSizeClasses(): string {
    switch (this.size) {
      case 'sm': return 'text-sm px-2 py-1';
      case 'lg': return 'text-base px-4 py-3';
      default: return 'text-sm px-3 py-2';
    }
  }

  getVariantClasses(): string {
    if (this.disabled) {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed';
    }

    switch (this.variant) {
      case 'filled':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700';
      default:
        return 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500';
    }
  }
}
