import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-providers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './providers.html',
  styleUrl: './providers.css'
})
export class ProvidersComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public providers = signal<any[]>([]);
  public loading = false;

  ngOnInit() {
    this.loadProviders();
  }

  loadProviders() {
    this.loading = true;
    this.http.get<any>('/api/admin/providers').subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.providers.set(res.data);
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load providers list.');
      }
    });
  }

  async verifyProvider(providerId: number, kycStatus: string) {
    const action = kycStatus === 'Verified' ? 'approve' : 'reject';
    const confirmed = await this.toast.confirm(
      `Are you sure you want to ${action} this provider's KYC request?`,
      kycStatus === 'Verified' ? 'Yes, Approve' : 'Yes, Reject',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.put<any>(`/api/admin/providers/${providerId}/verify`, { kycStatus }).subscribe({
      next: (res) => {
        this.toast.success(res.message || `Provider KYC status updated to ${kycStatus}.`);
        this.loadProviders();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update KYC status.');
      }
    });
  }

  async toggleSuspension(userId: number, currentStatus: string) {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    const action = nextStatus === 'Suspended' ? 'suspend' : 'activate';

    const confirmed = await this.toast.confirm(
      `Are you sure you want to ${action} this user account?`,
      nextStatus === 'Suspended' ? 'Yes, Suspend' : 'Yes, Activate',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.put<any>(`/api/admin/users/${userId}/status`, { status: nextStatus }).subscribe({
      next: (res) => {
        this.toast.success(res.message || `User account set to ${nextStatus}.`);
        this.loadProviders();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update user account status.');
      }
    });
  }
}
