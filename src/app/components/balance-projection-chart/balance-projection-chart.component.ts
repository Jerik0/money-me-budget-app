import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartData, Point, TimeScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ProjectionInterval, TimeUnit } from '../../enums';
import { Transaction, ProjectionPoint, TimelineItem } from '../../interfaces';
import { CustomDropdownComponent, DropdownOption } from '../shared/custom-dropdown/custom-dropdown.component';

// Register Chart.js components
Chart.register(TimeScale, LinearScale, PointElement, LineElement, LineController, Title, Tooltip, Legend, Filler);

@Component({
    selector: 'app-balance-projection-chart',
    standalone: true,
    imports: [CommonModule, FormsModule, CustomDropdownComponent],
    templateUrl: './balance-projection-chart.component.html',
    styles: []
})
export class BalanceProjectionChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() timeline: (TimelineItem | ProjectionPoint)[] = [];
  @Input() projectionInterval: ProjectionInterval = ProjectionInterval.MONTHLY;
  @Input() currentBalance: number = 0;

  @Output() intervalChange = new EventEmitter<ProjectionInterval>();
  @Output() chartClick = new EventEmitter<Date>();

  // Dropdown options
  projectionIntervalOptions: DropdownOption[] = [
    { value: ProjectionInterval.DAILY, label: 'Daily' },
    { value: ProjectionInterval.WEEKLY, label: 'Weekly' },
    { value: ProjectionInterval.BI_WEEKLY, label: 'Bi-weekly' },
    { value: ProjectionInterval.MONTHLY, label: 'Monthly' },
    { value: ProjectionInterval.QUARTERLY, label: 'Quarterly' },
    { value: ProjectionInterval.YEARLY, label: 'Yearly' }
  ];

  @ViewChild('balanceChart', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      this.createChart();
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.chart && (changes['timeline'] || changes['projectionInterval'] || changes['currentBalance'])) {
      this.updateChart();
    }
  }

  private createChart() {
    if (!this.chartCanvas || typeof window === 'undefined') return;
    
    try {
      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      const config: ChartConfiguration = {
        type: 'line',
        data: {
                            datasets: [{
                    label: 'Account Balance',
                    data: [],
                    borderColor: '#14b8a6',
                    backgroundColor: 'rgba(20, 184, 166, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#14b8a6',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#14b8a6',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: '#f9fafb',
              bodyColor: '#f9fafb',
              borderColor: '#374151',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              titleFont: {
                size: 13,
                weight: 'bold'
              },
              bodyFont: {
                size: 14,
                weight: 'normal'
              },
              padding: 12,
              callbacks: {
                title: function(context: any) {
                  return new Date(context[0].parsed.x).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                },
                label: function(context: any) {
                  const value = context.parsed.y;
                  return `Balance: $${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: this.getTimeUnit(),
                displayFormats: this.getDisplayFormats()
              },
              grid: {
                display: false
              },
              border: {
                display: false
              },
              ticks: {
                color: '#9ca3af',
                font: {
                  size: 12,
                  weight: 'normal'
                },
                padding: 8
              }
            },
            y: {
              beginAtZero: false,
              position: 'right',
              grid: {
                color: 'rgba(156, 163, 175, 0.15)'
              },
              border: {
                display: false
              },
              ticks: {
                color: '#9ca3af',
                font: {
                  size: 12,
                  weight: 'normal'
                },
                padding: 12,
                callback: function(value: any) {
                  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                }
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const element = elements[0];
              const dataPoint = this.chart?.data.datasets[0].data[element.index];
              if (dataPoint && typeof dataPoint === 'object' && 'x' in dataPoint) {
                const clickedDate = new Date(dataPoint.x);
                this.chartClick.emit(clickedDate);
              }
            }
          },
          elements: {
            point: {
              hoverRadius: 8
            }
          },
          animation: {
            duration: 750,
            easing: 'easeInOutQuart'
          },
          hover: {
            mode: 'nearest',
            intersect: false
          },
          layout: {
            padding: {
              top: 20,
              right: 20,
              bottom: 10,
              left: 10
            }
          }
        }
      };

      this.chart = new Chart(ctx, config);
      this.updateChart();
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }

  private updateChart() {
    if (!this.chart || typeof window === 'undefined') return;

    try {
      const chartData = this.getChartData();
      
      if (chartData.data.length > 0) {
        this.chart.data.datasets[0].data = chartData.data;
        
        // Update time unit and display formats
        if (this.chart.options.scales?.['x'] && typeof this.chart.options.scales['x'] === 'object') {
          const xScale = this.chart.options.scales['x'] as any;
          xScale.time.unit = this.getTimeUnit();
          xScale.time.displayFormats = this.getDisplayFormats();
        }
        
        this.chart.update();
      }
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  }

  private getChartData(): { data: Point[] } {
    const data: Point[] = [];

    // Add current balance as starting point
    data.push({ x: new Date().getTime(), y: this.currentBalance } as Point);

    // Add all timeline items with balances (both transactions and projection points)
    this.timeline.forEach(item => {
      if (this.isProjectionPoint(item)) {
        data.push({ x: item.date.getTime(), y: item.balance } as Point);
      } else if (this.isTransaction(item)) {
        data.push({ x: item.date.getTime(), y: item.balance } as Point);
      }
    });

    // Sort by date to ensure proper line drawing
    data.sort((a, b) => a.x - b.x);

    return { data };
  }

  private getTimeUnit(): TimeUnit {
    switch (this.projectionInterval) {
      case ProjectionInterval.DAILY:
        return TimeUnit.DAY;
      case ProjectionInterval.WEEKLY:
        return TimeUnit.WEEK;
      case ProjectionInterval.BI_WEEKLY:
        return TimeUnit.WEEK;
      case ProjectionInterval.MONTHLY:
        return TimeUnit.MONTH;
      case ProjectionInterval.QUARTERLY:
        return TimeUnit.QUARTER;
      case ProjectionInterval.YEARLY:
        return TimeUnit.YEAR;
      default:
        return TimeUnit.MONTH;
    }
  }

  private getDisplayFormats(): any {
    switch (this.projectionInterval) {
      case ProjectionInterval.DAILY:
        return {
          day: 'MMM d'
        };
      case ProjectionInterval.WEEKLY:
        return {
          week: 'MMM d'
        };
      case ProjectionInterval.BI_WEEKLY:
        return {
          week: 'MMM d'
        };
      case ProjectionInterval.MONTHLY:
        return {
          month: 'MMM yyyy'
        };
      case ProjectionInterval.QUARTERLY:
        return {
          quarter: 'MMM yyyy'
        };
      case ProjectionInterval.YEARLY:
        return {
          year: 'yyyy'
        };
      default:
        return {
          month: 'MMM yyyy'
        };
    }
  }

  private isTransaction(item: any): item is TimelineItem {
    return 'type' in item && 'amount' in item && 'description' in item;
  }

  private isProjectionPoint(item: any): item is ProjectionPoint {
    return 'type' in item && !('amount' in item);
  }

  onIntervalChange() {
    this.intervalChange.emit(this.projectionInterval);
  }

  get ProjectionInterval() {
    return ProjectionInterval;
  }
}
