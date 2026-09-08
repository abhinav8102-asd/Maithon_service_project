import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);

  public stats = signal<any>({
    totalUsers: 0,
    totalProviders: 0,
    pendingProviders: 0,
    verifiedProviders: 0,
    totalBookings: 0,
    bookingsToday: 0,
    bookingsThisMonth: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    grossRevenue: '0.00',
    platformCommission: '0.00'
  });
  
  public recentBookings = signal<any[]>([]);

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>('/api/admin/dashboard').subscribe({
      next: (res) => {
        if (res.success) {
          this.stats.set(res.data.stats);
          this.recentBookings.set(res.data.recentBookings);
        }
      }
    });
  }
}
