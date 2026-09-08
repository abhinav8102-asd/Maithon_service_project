import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.html'
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  settingsForm!: FormGroup;
  loading = false;
  logoFile: File | null = null;
  logoPreview: string | null = null;
  heroBgFile: File | null = null;
  heroBgPreview: string | null = null;

  jsonValidator(control: any) {
    if (!control.value) return null;
    try {
      JSON.parse(control.value);
      return null;
    } catch (e) {
      return { invalidJson: true };
    }
  }

  ngOnInit() {
    this.settingsForm = this.fb.group({
      contactPhone: ['', [Validators.required]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactAddress: ['', [Validators.required]],
      facebookLink: [''],
      instagramLink: [''],
      privacyPolicy: ['', [Validators.required]],
      termsConditions: ['', [Validators.required]],
      heroSubtitle: [''],
      heroTitle: [''],
      heroDescription: [''],
      featuresJson: ['', [Validators.required, this.jsonValidator]],
      modulesJson: ['', [Validators.required, this.jsonValidator]],
      statsJson: ['', [Validators.required, this.jsonValidator]],
      workflowJson: ['', [Validators.required, this.jsonValidator]]
    });

    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;
    this.http.get<any>('/api/settings').subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          const d = res.data;
          this.settingsForm.patchValue({
            contactPhone: d.contactPhone || '',
            contactEmail: d.contactEmail || '',
            contactAddress: d.contactAddress || '',
            facebookLink: d.facebookLink || '',
            instagramLink: d.instagramLink || '',
            privacyPolicy: d.privacyPolicy || '',
            termsConditions: d.termsConditions || '',
            heroSubtitle: d.heroSubtitle || '',
            heroTitle: d.heroTitle || '',
            heroDescription: d.heroDescription || '',
            featuresJson: d.featuresJson || '',
            modulesJson: d.modulesJson || '',
            statsJson: d.statsJson || '',
            workflowJson: d.workflowJson || ''
          });
          if (d.logo) {
            this.logoPreview = environment.apiUrl + d.logo;
          }
          if (d.heroBgImage) {
            this.heroBgPreview = environment.apiUrl + d.heroBgImage;
          }
        }
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load system settings.');
      }
    });
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.logoFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onHeroBgSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.heroBgFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.heroBgPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.settingsForm.invalid) {
      console.warn('Form validation failed. Details:');
      Object.keys(this.settingsForm.controls).forEach(key => {
        const control = this.settingsForm.get(key);
        if (control?.invalid) {
          console.warn(`Control [${key}] is invalid. Errors:`, control.errors);
        }
      });
      this.toast.error('Please fix validation errors before saving.');
      return;
    }

    this.loading = true;
    const formData = new FormData();
    formData.append('contactPhone', this.settingsForm.value.contactPhone);
    formData.append('contactEmail', this.settingsForm.value.contactEmail);
    formData.append('contactAddress', this.settingsForm.value.contactAddress);
    formData.append('facebookLink', this.settingsForm.value.facebookLink);
    formData.append('instagramLink', this.settingsForm.value.instagramLink);
    formData.append('privacyPolicy', this.settingsForm.value.privacyPolicy);
    formData.append('termsConditions', this.settingsForm.value.termsConditions);
    
    formData.append('heroSubtitle', this.settingsForm.value.heroSubtitle || '');
    formData.append('heroTitle', this.settingsForm.value.heroTitle || '');
    formData.append('heroDescription', this.settingsForm.value.heroDescription || '');
    formData.append('featuresJson', this.settingsForm.value.featuresJson || '');
    formData.append('modulesJson', this.settingsForm.value.modulesJson || '');
    formData.append('statsJson', this.settingsForm.value.statsJson || '');
    formData.append('workflowJson', this.settingsForm.value.workflowJson || '');

    if (this.logoFile) {
      formData.append('logo', this.logoFile);
    }
    if (this.heroBgFile) {
      formData.append('heroBgImage', this.heroBgFile);
    }

    this.http.put<any>('/api/settings', formData).subscribe({
      next: (res) => {
        this.loading = false;
        this.toast.success('System settings updated successfully!');
        if (res.data) {
          if (res.data.logo) {
            this.logoPreview = environment.apiUrl + res.data.logo;
          }
          if (res.data.heroBgImage) {
            this.heroBgPreview = environment.apiUrl + res.data.heroBgImage;
          }
        }
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.error?.message || 'Failed to update system settings.');
      }
    });
  }
}
