import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css'
})
export class BookingsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public bookings = signal<any[]>([]);
  public filteredBookings = signal<any[]>([]);
  public activeFilter = '';
  public loading = false;

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.loading = true;
    this.http.get<any>('/api/admin/bookings').subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.bookings.set(res.data);
          this.applyFilter();
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load bookings list.');
      }
    });
  }

  applyFilter() {
    if (this.activeFilter === '') {
      this.filteredBookings.set(this.bookings());
    } else {
      this.filteredBookings.set(this.bookings().filter(b => b.status === this.activeFilter));
    }
  }

  async cancelBooking(bookingId: number) {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to cancel this booking? The customer and provider will be notified.',
      'Yes, Cancel Booking',
      'Keep Booking'
    );
    if (!confirmed) return;

    this.http.put<any>(`/api/bookings/${bookingId}/status`, { status: 'Cancelled' }).subscribe({
      next: () => {
        this.toast.success('Booking successfully cancelled.');
        this.loadBookings();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to cancel booking.');
      }
    });
  }
}
