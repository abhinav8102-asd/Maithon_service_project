import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-customer-bookings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css'
})
export class CustomerBookingsComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  public bookings = signal<any[]>([]);
  public filteredBookings = signal<any[]>([]);
  public activeTab = 'All';

  // Review Modal State
  public showReviewModal = false;
  public selectedBookingForReview: any = null;
  public reviewForm = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['']
  });

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.http.get<any>('/api/bookings/history/customer').subscribe({
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

  async cancelBooking(bookingId: number) {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to cancel this booking request?',
      'Yes, Cancel',
      'Keep Booking'
    );
    if (!confirmed) return;

    this.http.put<any>(`/api/bookings/${bookingId}/status`, { status: 'Cancelled' }).subscribe({
      next: () => {
        this.toast.success('Booking cancelled successfully.');
        this.loadBookings();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to cancel booking.');
      }
    });
  }

  openReviewModal(booking: any) {
    this.selectedBookingForReview = booking;
    this.reviewForm.reset({ rating: 5, comment: '' });
    this.showReviewModal = true;
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.selectedBookingForReview = null;
  }

  submitReview() {
    if (this.reviewForm.invalid || !this.selectedBookingForReview) return;

    const payload = {
      ...this.reviewForm.value,
      bookingId: this.selectedBookingForReview.id
    };

    this.http.post<any>('/api/customers/reviews', payload).subscribe({
      next: () => {
        this.toast.success('Thank you for your rating & feedback! Your review has been submitted.');
        this.closeReviewModal();
        this.loadBookings();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to submit review.');
      }
    });
  }
}
