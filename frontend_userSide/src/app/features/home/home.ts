import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly apiUrl = environment.apiUrl;
  public settings = signal<any>(null);
  public featuresList = signal<any[]>([]);
  public modulesList = signal<any[]>([]);
  public statsList = signal<any[]>([]);
  public workflowList = signal<any[]>([]);

  public categories = signal<any[]>([]);
  public cities = signal<any[]>([]);
  public areas = signal<any[]>([]);
  public providers = signal<any[]>([]);
  
  // Search state variables
  public searchName = '';
  public selectedCategory = '';
  public selectedCity = '';
  public selectedArea = '';

  // Booking trigger options
  public showBookingModal = false;
  public selectedProviderForBooking: any = null;
  
  public bookingForm = this.fb.group({
    serviceId: ['', Validators.required],
    bookingDate: ['', Validators.required],
    bookingTime: ['', Validators.required],
    address: ['', Validators.required],
    pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    paymentMethod: ['Cash', Validators.required]
  });

  // Support state
  public supportSuccess = false;
  public supportForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', Validators.required]
  });

  ngOnInit() {
    this.loadSettings();
    this.loadFilters();
    this.search();
  }

  loadSettings() {
    this.http.get<any>('/api/settings').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          this.settings.set(d);
          
          try {
            this.featuresList.set(d.featuresJson ? JSON.parse(d.featuresJson) : []);
          } catch (e) {
            console.error('Error parsing features JSON:', e);
          }
          
          try {
            this.modulesList.set(d.modulesJson ? JSON.parse(d.modulesJson) : []);
          } catch (e) {
            console.error('Error parsing modules JSON:', e);
          }

          try {
            this.statsList.set(d.statsJson ? JSON.parse(d.statsJson) : []);
          } catch (e) {
            console.error('Error parsing stats JSON:', e);
          }

          try {
            this.workflowList.set(d.workflowJson ? JSON.parse(d.workflowJson) : []);
          } catch (e) {
            console.error('Error parsing workflow JSON:', e);
          }
        }
      }
    });
  }

  quickSearch() {
    this.search();
    setTimeout(() => {
      const element = document.getElementById('results-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  loadFilters() {
    this.http.get<any>('/api/categories').subscribe(res => {
      if (res.success) this.categories.set(res.data);
    });

    this.http.get<any>('/api/admin/locations').subscribe(res => {
      if (res.success) {
        this.cities.set(res.data);
      }
    });
  }

  onCityChange() {
    this.selectedArea = '';
    const city = this.cities().find(c => c.id == this.selectedCity);
    this.areas.set(city ? city.Areas : []);
  }

  search() {
    let url = `/api/customers/providers/search?`;
    if (this.selectedCategory) url += `categoryId=${this.selectedCategory}&`;
    if (this.selectedCity) url += `cityId=${this.selectedCity}&`;
    if (this.selectedArea) url += `areaId=${this.selectedArea}&`;
    if (this.searchName) url += `name=${encodeURIComponent(this.searchName)}&`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res.success) this.providers.set(res.data);
      }
    });
  }

  resetFilters() {
    this.searchName = '';
    this.selectedCategory = '';
    this.selectedCity = '';
    this.selectedArea = '';
    this.areas.set([]);
    this.search();
  }

  openBooking(provider: any) {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    if (this.authService.getRole() !== 'Customer') {
      this.toast.warning('Only Customer accounts are allowed to place booking requests.');
      return;
    }

    this.selectedProviderForBooking = provider;
    this.bookingForm.patchValue({
      address: this.authService.currentUser()?.profile?.address || '',
      pincode: this.authService.currentUser()?.profile?.pincode || ''
    });
    this.showBookingModal = true;
  }

  closeBooking() {
    this.showBookingModal = false;
    this.selectedProviderForBooking = null;
    this.bookingForm.reset({ paymentMethod: 'Cash' });
  }

  submitBooking() {
    if (this.bookingForm.invalid || !this.selectedProviderForBooking) return;

    const payload = {
      ...this.bookingForm.value,
      providerId: this.selectedProviderForBooking.id,
      customerName: this.authService.currentUser()?.name
    };

    this.http.post<any>('/api/bookings', payload).subscribe({
      next: (res) => {
        this.toast.success('Booking request placed successfully!');
        this.closeBooking();
        this.router.navigate(['/customer/bookings']);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to submit service booking request.');
      }
    });
  }

  submitSupport() {
    if (this.supportForm.invalid) return;

    this.http.post<any>('/api/customers/support', this.supportForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.supportSuccess = true;
          this.supportForm.reset();
          setTimeout(() => this.supportSuccess = false, 3500);
        }
      }
    });
  }
}
