import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-chats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chats.html',
  styleUrl: './chats.css'
})
export class ChatsComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public conversations = signal<any[]>([]);
  public activeMessages = signal<any[]>([]);
  public selectedConversation = signal<any>(null);

  public isConversationsLoading = false;
  public isHistoryLoading = false;
  public backendUrl = environment.apiUrl;

  ngOnInit() {
    this.loadConversations();
  }

  loadConversations() {
    this.isConversationsLoading = true;
    this.http.get<any>('/api/chat/admin/conversations').subscribe({
      next: (res) => {
        this.isConversationsLoading = false;
        if (res.success) {
          this.conversations.set(res.data);
        }
      },
      error: () => {
        this.isConversationsLoading = false;
        this.toast.error('Failed to load conversations list.');
      }
    });
  }

  selectConversation(conv: any) {
    this.selectedConversation.set(conv);
    this.activeMessages.set([]);
    this.isHistoryLoading = true;

    this.http.get<any>(`/api/chat/admin/conversations/${conv.userAId}/${conv.userBId}`).subscribe({
      next: (res) => {
        this.isHistoryLoading = false;
        if (res.success) {
          this.activeMessages.set(res.data);
          this.scrollToBottom();
        }
      },
      error: () => {
        this.isHistoryLoading = false;
        this.toast.error('Failed to load conversation message logs.');
      }
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('admin-chat-scroller');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
