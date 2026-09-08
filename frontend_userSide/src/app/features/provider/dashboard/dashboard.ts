import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class ProviderDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private toast = inject(ToastService);
  private api = inject(ApiService);

  public stats = signal<any>({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalEarnings: '0.00'
  });
  
  public reviews = signal<any[]>([]);
  public isLoadingStats = signal<boolean>(false);
  public currentAvailability = 'Offline';

  ngOnInit() {
    this.loadStats();
    // Read availability from current user profile
    const profile = this.authService.currentUser()?.profile;
    this.currentAvailability = profile?.availabilityStatus || 'Offline';
  }

  loadStats() {
    this.isLoadingStats.set(true);
    // Use absolute URL via ApiService (interceptor also handles relative, but explicit is safer)
    this.http.get<any>(`${this.api.providerDashboard}`).subscribe({
      next: (res) => {
        this.isLoadingStats.set(false);
        if (res.success) {
          this.stats.set(res.data.stats);
          this.reviews.set(res.data.reviews || []);
        }
      },
      error: (err) => {
        this.isLoadingStats.set(false);
        this.toast.error(err.error?.message || 'Failed to load dashboard stats.');
      }
    });
  }

  onAvailabilityChange() {
    this.http.post<any>(`${this.api.providerAvailability}`, { status: this.currentAvailability }).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Availability status updated.');
        const currentUser = this.authService.currentUser();
        if (currentUser && currentUser.profile) {
          currentUser.profile.availabilityStatus = this.currentAvailability;
          this.authService.currentUser.set({ ...currentUser });
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to toggle availability.');
      }
    });
  }
}
