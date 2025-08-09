import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  isDarkTheme = true; // Default to dark theme
  currentPageTitle = 'Dashboard';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Only access localStorage and document in browser environment
    if (isPlatformBrowser(this.platformId)) {
      // Check for saved theme preference or default to dark
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        this.isDarkTheme = savedTheme === 'dark';
      }
      this.applyTheme();

      // Listen for route changes to update page title
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.updatePageTitle(event.url);
      });
    } else {
      // Server-side: default to dark theme but don't apply to document
      // The dark class will be applied when the component hydrates on the client
    }
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
      this.applyTheme();
    }
  }

  private applyTheme(): void {
    if (isPlatformBrowser(this.platformId) && typeof document !== 'undefined') {
      if (this.isDarkTheme) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  private updatePageTitle(url: string): void {
    switch (url) {
      case '/dashboard':
        this.currentPageTitle = 'Dashboard';
        break;
      case '/transactions':
        this.currentPageTitle = 'Transactions';
        break;
      case '/budgets':
        this.currentPageTitle = 'Budgets';
        break;
      case '/goals':
        this.currentPageTitle = 'Goals';
        break;
      case '/reports':
        this.currentPageTitle = 'Reports';
        break;
      default:
        this.currentPageTitle = 'Dashboard';
    }
  }
}
