// Policy Component — loads privacy policy or terms from backend settings
import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="policy-container">
      <div class="policy-card">
        <h2 class="policy-title">{{ pageTitle }}</h2>
        <div class="policy-divider"></div>
        <div class="policy-content">
          <p *ngIf="loading" class="loading-text">Loading...</p>
          <p *ngIf="!loading && policyText">{{ policyText }}</p>
          <p *ngIf="!loading && !policyText" class="loading-text">No content available yet.</p>
        </div>
        <div style="margin-top:30px">
          <a routerLink="/" class="btn-back">← Back to Home</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .policy-container { max-width: 800px; margin: 60px auto; padding: 0 20px; }
    .policy-card { background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .policy-title { font-size: 2rem; font-weight: 800; color: var(--text-title, #1e293b); margin: 0 0 10px; }
    .policy-divider { height: 3px; width: 60px; background: #6366f1; border-radius: 99px; margin-bottom: 28px; }
    .policy-content { font-size: 1rem; line-height: 1.8; color: var(--text-body, #475569); white-space: pre-wrap; }
    .loading-text { color: #94a3b8; font-style: italic; }
    .btn-back { display: inline-block; padding: 10px 24px; background: #6366f1; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .btn-back:hover { background: #4f46e5; }
  `]
})
export class PolicyComponent implements OnInit {
  pageTitle = 'Privacy Policy';
  policyText = '';
  loading = true;

  constructor(private zone: NgZone) {}

  ngOnInit() {
    const url = window.location.href;
    if (url.includes('privacy-policy')) {
      this.pageTitle = 'Privacy Policy';
      this.loadPolicy('privacyPolicy');
    } else {
      this.pageTitle = 'Terms & Conditions';
      this.loadPolicy('termsConditions');
    }
  }

  loadPolicy(key: 'privacyPolicy' | 'termsConditions') {
    fetch(`${environment.apiUrl}/api/settings`)
      .then(res => res.json())
      .then(data => {
        // Run inside NgZone so Angular change detection picks up the update
        this.zone.run(() => {
          this.loading = false;
          if (data && data.success && data.data) {
            this.policyText = data.data[key] || '';
          }
        });
      })
      .catch(err => {
        console.error('Policy fetch error:', err);
        this.zone.run(() => {
          this.loading = false;
          this.policyText = '';
        });
      });
  }
}
