import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-provider-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css'
})
export class ProviderBookingsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public bookings = signal<any[]>([]);
  public filteredBookings = signal<any[]>([]);
  public activeTab = 'All';

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.http.get<any>('/api/providers/bookings').subscribe({
      next: (res) => {
        if (res.success) {
          this.bookings.set(res.data);
          this.filterTab(this.activeTab);
        }
      },
      error: () => this.toast.error('Failed to load bookings.')
    });
  }

  filterTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'All') {
      this.filteredBookings.set(this.bookings());
    } else {
      this.filteredBookings.set(this.bookings().filter(b => b.status === tab));
    }
  }

  async updateStatus(bookingId: number, status: string) {
    const actionLabel = status === 'Accepted' ? 'accept' : status === 'Rejected' ? 'reject' : 'mark as completed';
    const confirmed = await this.toast.confirm(
      `Are you sure you want to ${actionLabel} this booking?`,
      'Yes, Confirm',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.put<any>(`/api/bookings/${bookingId}/status`, { status }).subscribe({
      next: () => {
        this.toast.success(`Booking status updated to ${status}.`);
        this.loadBookings();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update booking status.');
      }
    });
  }
}
