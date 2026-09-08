import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-provider-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProviderProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private toast = inject(ToastService);

  public cities = signal<any[]>([]);
  public areas = signal<any[]>([]);
  public isEditing = false;

  // Tabs navigation
  public activeTab = 'profile'; // 'profile' | 'services' | 'subscriptions'

  // Service portfolio properties
  public myServices = signal<any[]>([]);
  public allServices = signal<any[]>([]);

  // Subscriptions properties
  public subscriptionPackages = signal<any[]>([]);
  public activeSubscription = signal<any>(null);

  public profileForm = this.fb.group({
    businessName: ['', Validators.required],
    experienceYears: [0, [Validators.required, Validators.min(0)]],
    pricing: [0.00, [Validators.required, Validators.min(0)]],
    cityId: [''],
    areaId: [''],
    workingHoursStart: ['09:00'],
    workingHoursEnd: ['18:00'],
    skillsList: [''],
    languagesList: ['']
  });

  public passwordForm = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit() {
    this.loadLocations();
    this.loadProfileData();
    this.loadMyServices();
    this.loadAllServices();
    this.loadSubscriptionPackages();
    this.loadActiveSubscription();
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
      const profile = user.profile;
      
      const skillsStr = profile.skills ? profile.skills.join(', ') : '';
      const languagesStr = profile.languages ? profile.languages.join(', ') : '';
      
      const startHr = profile.workingHours?.start || '09:00';
      const endHr = profile.workingHours?.end || '18:00';

      this.profileForm.patchValue({
        businessName: profile.businessName || '',
        experienceYears: profile.experienceYears || 0,
        pricing: profile.pricing || 0.00,
        cityId: profile.cityId || '',
        areaId: profile.areaId || '',
        workingHoursStart: startHr,
        workingHoursEnd: endHr,
        skillsList: skillsStr,
        languagesList: languagesStr
      });

      setTimeout(() => this.onCityChange(true), 200);
    }
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) return;

    const skillsArray = this.profileForm.value.skillsList
      ? this.profileForm.value.skillsList.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
      : [];
    const languagesArray = this.profileForm.value.languagesList
      ? this.profileForm.value.languagesList.split(',').map((l: string) => l.trim()).filter((l: string) => l !== '')
      : [];

    const payload = {
      businessName: this.profileForm.value.businessName,
      experienceYears: this.profileForm.value.experienceYears,
      pricing: this.profileForm.value.pricing,
      cityId: this.profileForm.value.cityId,
      areaId: this.profileForm.value.areaId,
      workingHours: {
        start: this.profileForm.value.workingHoursStart,
        end: this.profileForm.value.workingHoursEnd
      },
      skills: skillsArray,
      languages: languagesArray
    };

    this.http.put<any>('/api/providers/profile', payload).subscribe({
      next: (res) => {
        this.toast.success('Business profile updated successfully!');
        this.isEditing = false;

        const currentUser = this.authService.currentUser();
        currentUser.profile = res.data;
        this.authService.currentUser.set({ ...currentUser });
        localStorage.setItem('user', JSON.stringify(currentUser));
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update business profile.');
      }
    });
  }

  onSubmitPassword() {
    if (this.passwordForm.invalid) return;

    this.http.post<any>('/api/auth/change-password', this.passwordForm.value).subscribe({
      next: () => {
        this.toast.success('Password updated! Logging you out in 2 seconds...');
        this.passwordForm.reset();
        
        setTimeout(() => {
          this.authService.clearSession();
        }, 2000);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to change password.');
      }
    });
  }

  // --- PORTFOLIO SERVICES METHODS ---
  loadMyServices() {
    this.http.get<any>('/api/providers/services').subscribe(res => {
      if (res.success) {
        this.myServices.set(res.data);
      }
    });
  }

  loadAllServices() {
    this.http.get<any>('/api/services').subscribe(res => {
      if (res.success) {
        this.allServices.set(res.data);
      }
    });
  }

  addServiceToPortfolio(serviceId: number, priceInput: HTMLInputElement) {
    const priceVal = parseFloat(priceInput.value);
    if (isNaN(priceVal) || priceVal < 0) {
      this.toast.warning('Please enter a valid price rate.');
      return;
    }

    this.http.post<any>('/api/providers/services', { serviceId, price: priceVal }).subscribe({
      next: () => {
        this.toast.success('Service added to your portfolio!');
        priceInput.value = '';
        this.loadMyServices();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to add service.');
      }
    });
  }

  updateServicePrice(serviceId: number, price: number) {
    if (price < 0) {
      this.toast.warning('Please enter a valid positive price rate.');
      return;
    }

    this.http.put<any>(`/api/providers/services/${serviceId}`, { price }).subscribe({
      next: () => {
        this.toast.success('Service price updated successfully!');
        this.loadMyServices();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update price.');
      }
    });
  }

  async removeServiceFromPortfolio(serviceId: number) {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to remove this service from your profile?',
      'Yes, Remove',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.delete<any>(`/api/providers/services/${serviceId}`).subscribe({
      next: () => {
        this.toast.success('Service removed from your portfolio.');
        this.loadMyServices();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to remove service.');
      }
    });
  }

  isServiceInPortfolio(serviceId: number): boolean {
    return this.myServices().some(ms => ms.serviceId === serviceId);
  }

  getPortfolioPrice(serviceId: number): number {
    const item = this.myServices().find(ms => ms.serviceId === serviceId);
    return item ? parseFloat(item.price) : 0;
  }

  // --- SUBSCRIPTIONS METHODS ---
  loadSubscriptionPackages() {
    this.http.get<any>('/api/admin/packages/public').subscribe(res => {
      if (res.success) {
        this.subscriptionPackages.set(res.data);
      }
    });
  }

  loadActiveSubscription() {
    this.http.get<any>('/api/providers/subscriptions/active').subscribe(res => {
      if (res.success) {
        this.activeSubscription.set(res.data);
      }
    });
  }

  async buySubscription(packageId: number) {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to purchase this subscription plan?',
      'Yes, Buy Now',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.post<any>('/api/providers/subscriptions/purchase', { packageId }).subscribe({
      next: () => {
        this.toast.success('Subscription package purchased successfully!');
        this.loadActiveSubscription();
        this.loadMyServices();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to purchase subscription.');
      }
    });
  }

  getMaxServicesLimit(): number {
    const active = this.activeSubscription();
    return active && active.SubscriptionPackage ? active.SubscriptionPackage.maxServices : 2;
  }
}
