import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatService } from './chat.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private apiUrl = `${environment.apiUrl}/api/auth`;

  // Standalone state management using Angular Signals
  currentUser = signal<any>(null);
  accessToken = signal<string | null>(null);

  constructor() {
    this.loadSession();
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.success) {
          this.setSession(res.accessToken, res.user);
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(null)), // Handle client-side logout even if server fails
      tap(() => {
        this.clearSession();
      })
    );
  }

  // Requests a new access token using the httpOnly refresh cookie
  refresh(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/refresh`, {}).pipe(
      tap(res => {
        if (res.success) {
          this.accessToken.set(res.accessToken);
          localStorage.setItem('access_token', res.accessToken);
        }
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  private setSession(token: string, user: any) {
    this.accessToken.set(token);
    this.currentUser.set(user);
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.chatService.connectSocket();
  }

  public clearSession() {
    this.accessToken.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.chatService.disconnectSocket();
    this.router.navigate(['/auth/login']);
  }

  private loadSession() {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.accessToken.set(token);
      this.currentUser.set(JSON.parse(user));
    }
  }

  isLoggedIn(): boolean {
    return !!this.accessToken();
  }

  getRole(): string | null {
    const user = this.currentUser();
    return user ? user.role : null;
  }
}
