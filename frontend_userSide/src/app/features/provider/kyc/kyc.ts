import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-provider-kyc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kyc.html',
  styleUrl: './kyc.css'
})
export class ProviderKycComponent implements OnInit {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private toast = inject(ToastService);

  public selectedAadhaar: File | null = null;
  public selectedPan: File | null = null;
  public loading = false;
  public submitted = false;
  public currentKycStatus = 'Pending';

  // Track if documents have already been submitted before (to show correct banner)
  public hasExistingDocuments = false;

  ngOnInit() {
    const profile = this.authService.currentUser()?.profile;
    this.currentKycStatus = profile?.kycStatus || 'Pending';
    // If aadhaar or pan path already exists on profile, they've uploaded before
    this.hasExistingDocuments = !!(profile?.aadhaarPath || profile?.panPath);
  }

  onAadhaarSelected(event: any) {
    const file = event.target.files[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      this.toast.warning('Aadhaar file is too large. Maximum allowed size is 5MB.');
      event.target.value = '';
      return;
    }
    this.selectedAadhaar = file;
  }

  onPanSelected(event: any) {
    const file = event.target.files[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      this.toast.warning('PAN file is too large. Maximum allowed size is 5MB.');
      event.target.value = '';
      return;
    }
    this.selectedPan = file;
  }

  onSubmitKyc(event: Event) {
    event.preventDefault();

    if (!this.selectedAadhaar && !this.selectedPan) {
      this.toast.warning('Please select at least one document (Aadhaar or PAN) to submit.');
      return;
    }

    // Guard against double-submission
    if (this.loading) return;

    this.loading = true;

    const formData = new FormData();
    if (this.selectedAadhaar) formData.append('aadhaar', this.selectedAadhaar);
    if (this.selectedPan) formData.append('pan', this.selectedPan);

    this.http.post<any>('/api/providers/kyc', formData).pipe(
      finalize(() => {
        // ALWAYS reset loading regardless of success or error
        this.loading = false;
      })
    ).subscribe({
      next: (res) => {
        this.submitted = true;
        this.currentKycStatus = res.data?.kycStatus || 'Pending';

        // Sync updated profile to auth state & localStorage
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, profile: res.data };
          this.authService.currentUser.set(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        this.selectedAadhaar = null;
        this.selectedPan = null;

        this.toast.success('KYC documents uploaded successfully! Our team will review within 24–48 hours.');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'KYC upload failed. Ensure files are under 5MB (JPEG, PNG, or PDF).');
      }
    });
  }
}
