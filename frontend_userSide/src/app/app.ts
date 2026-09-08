import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ChatService } from './core/services/chat.service';
import { ToastService } from './core/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { signal } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public authService = inject(AuthService);
  public chatService = inject(ChatService);
  public toastService = inject(ToastService);
  private router = inject(Router);
  private http = inject(HttpClient);
  
  readonly apiUrl = environment.apiUrl;
  settings: any = null;
  isDarkMode = false;

  // Real-time chat notification alert states
  activeToast = signal<any>(null);

  // Policy Modal State
  policyModalOpen = false;
  policyModalTitle = '';
  policyModalContent = '';

  ngOnInit() {
    this.loadSystemSettings();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || !savedTheme) {
      this.isDarkMode = true;
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }

    // Subscribe to incoming WebSocket message alerts globally
    this.chatService.notification$.subscribe((data: any) => {
      const currentUrl = this.router.url;
      if (currentUrl.includes(`/chat/${data.senderId}`)) {
        return; // Ignore popup if room is active
      }

      this.activeToast.set(data);
      this.playNotificationSound();

      setTimeout(() => {
        if (this.activeToast()?.senderId === data.senderId) {
          this.activeToast.set(null);
        }
      }, 4000);
    });
  }

  loadSystemSettings() {
    this.http.get<any>(`${environment.apiUrl}/api/settings`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.settings = res.data;
        }
      },
      error: () => {
        console.warn('System settings failed to load, falling back to layout defaults.');
      }
    });
  }

  openPolicy(type: 'privacy' | 'terms') {
    if (type === 'privacy') {
      this.policyModalTitle = 'Privacy Policy';
      this.policyModalContent = this.settings?.privacyPolicy || 'No privacy policy set yet.';
    } else {
      this.policyModalTitle = 'Terms & Conditions';
      this.policyModalContent = this.settings?.termsConditions || 'No terms & conditions set yet.';
    }
    this.policyModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closePolicy() {
    this.policyModalOpen = false;
    document.body.style.overflow = '';
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  logout() {
    this.authService.logout().subscribe();
  }

  // Synthesize double beep alert using Web Audio API
  private playNotificationSound() {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.connect(gain);
      gain.connect(context.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, context.currentTime); // D5 chime frequency
      gain.gain.setValueAtTime(0.15, context.currentTime);

      osc.start();
      osc.frequency.setValueAtTime(880.00, context.currentTime + 0.1); // A5 chime frequency
      
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.45);
      osc.stop(context.currentTime + 0.45);
    } catch (e) {
      // Autoplay block bypass fallback
    }
  }

  // Handle Toast click
  navigateToToastChat() {
    const toast = this.activeToast();
    if (toast) {
      this.router.navigate(['/chat', toast.senderId]);
      this.activeToast.set(null);
    }
  }
}
