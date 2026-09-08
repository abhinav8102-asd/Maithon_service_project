import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/api/auth`;

  currentUser = signal<any>(null);
  accessToken = signal<string | null>(null);

  constructor() {
    this.loadSession();
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.success && res.user.role === 'Admin') {
          this.setSession(res.accessToken, res.user);
        } else if (res.success) {
          throw new Error('Access denied. Only administrators are allowed to login here.');
        }
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => {
        this.clearSession();
      })
    );
  }

  refresh(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/refresh`, {}).pipe(
      tap(res => {
        if (res.success) {
          this.accessToken.set(res.accessToken);
          localStorage.setItem('admin_access_token', res.accessToken);
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
    localStorage.setItem('admin_access_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
  }

  public clearSession() {
    this.accessToken.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user');
    this.router.navigate(['/login']);
  }

  private loadSession() {
    const token = localStorage.getItem('admin_access_token');
    const user = localStorage.getItem('admin_user');
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
