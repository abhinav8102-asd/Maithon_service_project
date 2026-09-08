import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  readonly base = environment.apiUrl;

  // Auth
  readonly auth = `${this.base}/api/auth`;

  // Settings (public)
  readonly settings = `${this.base}/api/settings`;

  // Categories & Locations
  readonly categories = `${this.base}/api/categories`;
  readonly locations = `${this.base}/api/admin/locations`;

  // Customer
  readonly customerProfile = `${this.base}/api/customers/profile`;
  readonly customerProviders = `${this.base}/api/customers/providers/search`;
  readonly customerFavorites = `${this.base}/api/customers/favorites`;
  readonly customerSupport = `${this.base}/api/customers/support`;
  readonly customerReviews = `${this.base}/api/customers/reviews`;

  // Provider
  readonly providerProfile = `${this.base}/api/providers/profile`;
  readonly providerDashboard = `${this.base}/api/providers/dashboard`;
  readonly providerKyc = `${this.base}/api/providers/kyc`;
  readonly providerBookings = `${this.base}/api/providers/bookings`;
  readonly providerAvailability = `${this.base}/api/providers/availability`;

  // Bookings
  readonly bookings = `${this.base}/api/bookings`;
  bookingStatus(id: number) { return `${this.base}/api/bookings/${id}/status`; }
  bookingHistory(role: 'customer' | 'provider') { return `${this.base}/api/bookings/history/${role}`; }
}
