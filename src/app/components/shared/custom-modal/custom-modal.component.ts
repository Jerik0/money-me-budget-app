import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-custom-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-modal.component.html',
  styleUrls: ['./custom-modal.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)' }))
      ])
    ])
  ]
})
export class CustomModalComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  
  @Output() closeModal = new EventEmitter<void>();

  constructor(
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (this.isOpen && isPlatformBrowser(this.platformId)) {
      this.preventBodyScroll();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreBodyScroll();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.isOpen) {
      this.close();
    }
  }

  @HostListener('click', ['$event'])
  onBackdropClick(event: Event) {
    if (event.target === this.elementRef.nativeElement) {
      this.close();
    }
  }

  close() {
    this.closeModal.emit();
    if (isPlatformBrowser(this.platformId)) {
      this.restoreBodyScroll();
    }
  }

  private preventBodyScroll() {
    document.body.style.overflow = 'hidden';
  }

  private restoreBodyScroll() {
    document.body.style.overflow = '';
  }

  getSizeClasses(): string {
    switch (this.size) {
      case 'sm': return 'max-w-sm';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      default: return 'max-w-lg';
    }
  }
}
