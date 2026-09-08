import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-customer-favorites',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css'
})
export class CustomerFavoritesComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toast = inject(ToastService);

  public favorites = signal<any[]>([]);

  ngOnInit() {
    this.loadFavorites();
  }

  loadFavorites() {
    this.http.get<any>('/api/customers/favorites').subscribe({
      next: (res) => {
        if (res.success) {
          this.favorites.set(res.data);
        }
      },
      error: () => this.toast.error('Failed to load favorites.')
    });
  }

  async removeFavorite(providerId: number) {
    const confirmed = await this.toast.confirm(
      'Remove this provider from your favorites list?',
      'Yes, Remove',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.post<any>('/api/customers/favorites', { providerId }).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Provider removed from favorites.');
        this.loadFavorites();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update favorites.');
      }
    });
  }

  goToDetails(providerId: number) {
    this.router.navigate(['/'], { queryParams: { providerId } });
  }
}
