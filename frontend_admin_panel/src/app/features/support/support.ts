import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './support.html',
  styleUrl: './support.css'
})
export class SupportComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public messages = signal<any[]>([]);
  public loading = false;

  ngOnInit() {
    this.loadMessages();
  }

  loadMessages() {
    this.loading = true;
    this.http.get<any>('/api/admin/support').subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.messages.set(res.data);
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load support tickets.');
      }
    });
  }

  async resolveMessage(messageId: number) {
    const confirmed = await this.toast.confirm(
      'Mark this support ticket as resolved?',
      'Yes, Resolve',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.put<any>(`/api/admin/support/${messageId}/resolve`, {}).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Support query resolved successfully.');
        this.loadMessages();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update ticket status.');
      }
    });
  }
}
