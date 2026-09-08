import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { ToastService } from '../../core/services/toast.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnInit, OnDestroy {
  public chatService = inject(ChatService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  // Local state signals
  public inboxList = signal<any[]>([]);
  public activePartner = signal<any>(null);
  public isInboxLoading = signal<boolean>(false);
  public isHistoryLoading = signal<boolean>(false);
  public backendUrl = environment.apiUrl;

  // Message fields
  public messageText = '';
  public selectedFile: File | null = null;
  public imagePreview: string | null = null;

  // Typing tracking state
  private typingTimeout: any;
  private isTypingEventSent = false;

  // Subscriptions
  private routeSub!: Subscription;

  constructor() {
    // Automatically scroll to bottom whenever new messages arrive
    effect(() => {
      if (this.chatService.activeMessages().length > 0) {
        this.scrollToBottom();
      }
    });
  }

  ngOnInit() {
    this.loadInbox();

    // Check routing parameters for auto-opened chat partner
    this.routeSub = this.route.params.subscribe(params => {
      const partnerIdStr = params['partnerId'];
      if (partnerIdStr) {
        const partnerId = parseInt(partnerIdStr, 10);
        if (!isNaN(partnerId)) {
          this.openRoomById(partnerId);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    // Stop typing if destroying view
    const partner = this.activePartner();
    if (partner) {
      this.chatService.emitTyping(partner.id, false);
    }
  }

  loadInbox() {
    this.isInboxLoading.set(true);
    this.chatService.getInbox().subscribe({
      next: (res) => {
        if (res.success) {
          this.inboxList.set(res.data);
        }
        this.isInboxLoading.set(false);
      },
      error: () => this.isInboxLoading.set(false)
    });
  }

  openRoomById(partnerId: number) {
    // Reset active messages before loading new room
    this.chatService.activeMessages.set([]);
    this.isHistoryLoading.set(true);

    this.chatService.getMessagesHistory(partnerId).subscribe({
      next: (res) => {
        if (res.success) {
          // Try to resolve partner name from inbox first
          const inboxItem = this.inboxList().find(item => item.partnerId === partnerId);
          if (inboxItem) {
            this.activePartner.set({
              id: partnerId,
              name: inboxItem.partnerName,
              role: inboxItem.partnerRole
            });
            this.chatService.activeMessages.set(res.data);
            this.finishOpenRoom(partnerId);
          } else {
            // Partner not in inbox yet — fetch their info from API
            this.chatService.getPartnerInfo(partnerId).subscribe({
              next: (infoRes) => {
                if (infoRes.success) {
                  const info = infoRes.data;
                  this.activePartner.set({
                    id: partnerId,
                    name: info.name,
                    role: info.role,
                    businessName: info.businessName
                  });
                } else {
                  this.activePartner.set({ id: partnerId, name: 'User #' + partnerId, role: '' });
                }
              },
              error: () => {
                this.activePartner.set({ id: partnerId, name: 'User #' + partnerId, role: '' });
              }
            });
            this.chatService.activeMessages.set(res.data);
            this.finishOpenRoom(partnerId);
            this.loadInbox(); // Also refresh inbox list
          }
        }
        this.isHistoryLoading.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to load chat history.');
        this.isHistoryLoading.set(false);
      }
    });
  }

  private finishOpenRoom(partnerId: number) {
    // Connect/Join Room on socket server
    this.chatService.joinRoom(partnerId);
    // Mark all room messages read
    this.chatService.markRoomAsRead(partnerId).subscribe({
      next: () => this.loadInbox()
    });
    this.scrollToBottom();
  }


  selectConversation(partner: any) {
    this.router.navigate(['/chat', partner.partnerId]);
  }

  // Keyboard trigger for typing bubbles
  onInputChange() {
    const partner = this.activePartner();
    if (!partner) return;

    if (!this.isTypingEventSent) {
      this.isTypingEventSent = true;
      this.chatService.emitTyping(partner.id, true);
    }

    // Debounce timer to stop typing bubble
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.chatService.emitTyping(partner.id, false);
      this.isTypingEventSent = false;
    }, 2000);
  }

  // File Upload capture
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toast.warning('File is too large. Maximum allowed size is 5MB.');
      return;
    }

    // Check type limit (images only)
    if (!file.type.startsWith('image/')) {
      this.toast.warning('Only image files (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }

    this.selectedFile = file;

    // Show image preview
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.scrollToBottom();
    };
    reader.readAsDataURL(file);
  }

  clearFile() {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  sendMsg() {
    const partner = this.activePartner();
    if (!partner) return;

    if (!this.messageText.trim() && !this.selectedFile) return;

    const sendingText = this.messageText;
    const fileToSend = this.selectedFile || undefined;

    // Clear inputs immediately to keep UI snappy
    this.messageText = '';
    this.clearFile();

    // Stop typing immediately
    this.chatService.emitTyping(partner.id, false);
    this.isTypingEventSent = false;
    clearTimeout(this.typingTimeout);

    this.chatService.sendMessage(partner.id, sendingText, fileToSend).subscribe({
      next: (res) => {
        if (res.success) {
          // Socket listener receive_message will push the message to activeMessages.
          // No manual push here to avoid duplicates.
          this.loadInbox(); // Refresh inbox last message text
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to send message. Please try again.');
      }
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chat-scroll-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
