import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class CustomerProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  readonly apiUrl = environment.apiUrl;  // for template use

  public cities = signal<any[]>([]);
  public areas = signal<any[]>([]);
  public isEditing = false;
  
  public feedbackMessage: string | null = null;
  public isError = false;

  public profileForm = this.fb.group({
    address: [''],
    cityId: [''],
    areaId: ['']
  });

  public passwordForm = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {
    this.loadLocations();
    this.loadProfileData();
  }

  loadLocations() {
    this.http.get<any>('/api/admin/locations').subscribe(res => {
      if (res.success) this.cities.set(res.data);
    });
  }

  onCityChange(initMode = false) {
    const selectedCityId = this.profileForm.get('cityId')?.value;
    const city = this.cities().find(c => c.id == selectedCityId);
    this.areas.set(city ? city.Areas : []);
    
    if (!initMode) {
      this.profileForm.patchValue({ areaId: '' });
    }
  }

  loadProfileData() {
    const user = this.authService.currentUser();
    if (user && user.profile) {
      this.profileForm.patchValue({
        address: user.profile.address || '',
        cityId: user.profile.cityId || '',
        areaId: user.profile.areaId || ''
      });
      // Trigger chaining mapping for area
      setTimeout(() => this.onCityChange(true), 200);
    }
  }

  onSubmitProfile() {
    const payload = this.profileForm.value;
    
    this.http.put<any>('/api/customers/profile', payload).subscribe({
      next: (res) => {
        this.isError = false;
        this.feedbackMessage = 'Profile updated successfully!';
        this.isEditing = false;
        
        // Sync local storage state
        const currentUser = this.authService.currentUser();
        currentUser.profile = res.data;
        this.authService.currentUser.set({ ...currentUser });
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        this.clearFeedback();
      },
      error: (err) => {
        this.isError = true;
        this.feedbackMessage = err.error?.message || 'Failed to update profile details.';
        this.clearFeedback();
      }
    });
  }

  onSubmitPassword() {
    if (this.passwordForm.invalid) return;

    this.http.post<any>('/api/auth/change-password', this.passwordForm.value).subscribe({
      next: (res) => {
        this.isError = false;
        this.feedbackMessage = 'Password changed successfully! Logging out...';
        this.passwordForm.reset();
        
        setTimeout(() => {
          this.authService.clearSession();
        }, 2000);
      },
      error: (err) => {
        this.isError = true;
        this.feedbackMessage = err.error?.message || 'Old password verification failed.';
        this.clearFeedback();
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    this.http.put<any>('/api/customers/profile', formData).subscribe({
      next: (res) => {
        this.isError = false;
        this.feedbackMessage = 'Avatar picture uploaded successfully!';
        
        const currentUser = this.authService.currentUser();
        currentUser.profile = res.data;
        this.authService.currentUser.set({ ...currentUser });
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        this.clearFeedback();
      },
      error: (err) => {
        this.isError = true;
        this.feedbackMessage = err.error?.message || 'File upload failed.';
        this.clearFeedback();
      }
    });
  }

  private clearFeedback() {
    setTimeout(() => this.feedbackMessage = null, 4000);
  }
}
