import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Observable, Subject, EMPTY } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private socket!: Socket;
  
  // Sockets active room states
  public activeMessages = signal<any[]>([]);
  public isPartnerTyping = signal<boolean>(false);
  public currentUser = signal<any>(null);

  // Global unread message count for nav badge (WhatsApp-style)
  public totalUnreadCount = signal<number>(0);
  
  // Real-time notifications emitter
  public notification$ = new Subject<any>();

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.currentUser.set(null);
      return;
    }
    const user = JSON.parse(userStr);
    this.currentUser.set(user);

    // Disconnect stale socket if exists before creating new one
    if (this.socket && this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(environment.apiUrl, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Listen to incoming notifications globally — increment unread badge count
    this.socket.on('new_notification', (data: any) => {
      const currentUser = this.currentUser();
      if (currentUser && data.receiverId === currentUser.id) {
        this.notification$.next(data);
        // Only increment if user is not actively viewing that chat room
        this.totalUnreadCount.update(n => n + 1);
      }
    });

    // Load initial unread count from inbox on socket init
    this.refreshUnreadCount();
  }

  // Refresh global unread count by summing inbox unread counts
  public refreshUnreadCount() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    this.getInbox().subscribe({
      next: (res) => {
        if (res.success) {
          const total = res.data.reduce((sum: number, item: any) => sum + (item.unreadCount || 0), 0);
          this.totalUnreadCount.set(total);
        }
      },
      error: () => {} // Silent fail — just keep existing count
    });
  }

  // Connect socket on user login — re-read fresh user from localStorage
  public connectSocket() {
    this.initSocket();
  }

  // Disconnect socket on user logout
  public disconnectSocket() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.currentUser.set(null);
    this.activeMessages.set([]);
    this.isPartnerTyping.set(false);
    this.totalUnreadCount.set(0);
  }

  // Join private conversation room
  public joinRoom(partnerId: number) {
    const currentUser = this.currentUser();
    if (!currentUser || !this.socket) return;

    const ids = [currentUser.id, partnerId].sort((a, b) => a - b);
    const roomId = `chat_${ids[0]}_${ids[1]}`;

    // Join room on Socket.io server
    this.socket.emit('join_room', { roomId });

    // Setup private room message listener — always remove old first
    this.socket.off('receive_message');
    this.socket.on('receive_message', (message: any) => {
      this.activeMessages.update(msgs => [...msgs, message]);
      // Mark read if it's an incoming message in the active view
      if (message.senderId === partnerId) {
        this.markRoomAsRead(partnerId).subscribe();
      }
    });

    // Listen to partner typing states
    this.socket.off('typing');
    this.socket.on('typing', (data: any) => {
      if (data.senderId === partnerId) {
        this.isPartnerTyping.set(true);
      }
    });

    this.socket.off('stop_typing');
    this.socket.on('stop_typing', (data: any) => {
      if (data.senderId === partnerId) {
        this.isPartnerTyping.set(false);
      }
    });

    // Listen to partner read receipt indicators
    this.socket.off('mark_as_read');
    this.socket.on('mark_as_read', (data: any) => {
      if (data.senderId === partnerId) {
        this.activeMessages.update(msgs => 
          msgs.map(m => m.senderId === currentUser.id ? { ...m, isRead: true } : m)
        );
      }
    });
  }

  // Emit typing notification
  public emitTyping(partnerId: number, isTyping: boolean) {
    const currentUser = this.currentUser();
    if (!currentUser || !this.socket) return;

    const ids = [currentUser.id, partnerId].sort((a, b) => a - b);
    const roomId = `chat_${ids[0]}_${ids[1]}`;
    const event = isTyping ? 'typing' : 'stop_typing';
    
    this.socket.emit(event, { roomId, senderId: currentUser.id });
  }

  // API: Get inbox listing
  public getInbox(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/chat`);
  }

  // API: Get message history for room
  public getMessagesHistory(partnerId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/chat/history/${partnerId}`);
  }

  // API: Send message (Supports optional file attachment)
  public sendMessage(receiverId: number, text: string, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('receiverId', receiverId.toString());
    if (text) formData.append('messageText', text);
    if (file) formData.append('media', file);

    return this.http.post<any>(`${environment.apiUrl}/api/chat/send`, formData);
  }

  // API: Get partner's basic info (name/role) for fresh chat with no inbox entry
  public getPartnerInfo(userId: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/chat/partner/${userId}`);
  }

  // API: Mark messages as read — refreshes global unread count automatically
  public markRoomAsRead(partnerId: number): Observable<any> {
    const currentUser = this.currentUser();
    if (!currentUser || !this.socket) return EMPTY;

    const ids = [currentUser.id, partnerId].sort((a, b) => a - b);
    const roomId = `chat_${ids[0]}_${ids[1]}`;
    this.socket.emit('mark_as_read', { roomId, senderId: currentUser.id });

    return this.http.put<any>(`${environment.apiUrl}/api/chat/read/${partnerId}`, {}).pipe(
      tap(() => this.refreshUnreadCount()) // Auto-refresh global badge after marking read
    );
  }
}
