import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './services.html',
  styleUrl: './services.css'
})
export class ServicesComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public services = signal<any[]>([]);
  public categories = signal<any[]>([]);
  public providers = signal<any[]>([]);
  
  public showAddForm = false;
  public showEditForm = false;
  public showAssignForm = false;

  public selectedService: any = null;
  public loading = false;
  public selectedFiles: FileList | null = null;

  public serviceForm = this.fb.group({
    categoryId: ['', Validators.required],
    name: ['', Validators.required],
    price: [0.00, [Validators.required, Validators.min(0)]],
    durationMinutes: [60, [Validators.required, Validators.min(1)]],
    description: [''],
    requiredToolsList: [''] // Comma separated values
  });

  public assignForm = this.fb.group({
    providerId: ['', Validators.required]
  });

  ngOnInit() {
    this.loadServices();
    this.loadCategories();
    this.loadProviders();
  }

  loadServices() {
    this.http.get<any>('/api/services').subscribe({
      next: (res) => {
        if (res.success) this.services.set(res.data);
      },
      error: () => this.toast.error('Failed to load services.')
    });
  }

  loadCategories() {
    this.http.get<any>('/api/categories?status=Enabled').subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data);
      }
    });
  }

  loadProviders() {
    this.http.get<any>('/api/admin/providers?kycStatus=Verified').subscribe({
      next: (res) => {
        if (res.success) this.providers.set(res.data);
      }
    });
  }

  onFilesSelected(event: any) {
    this.selectedFiles = event.target.files;
  }

  openAdd() {
    this.showAddForm = true;
    this.showEditForm = false;
    this.showAssignForm = false;
    this.serviceForm.reset({ durationMinutes: 60, price: 0.00 });
    this.selectedFiles = null;
  }

  openEdit(service: any) {
    this.selectedService = service;
    this.showEditForm = true;
    this.showAddForm = false;
    this.showAssignForm = false;
    
    const toolsStr = service.requiredTools ? service.requiredTools.join(', ') : '';

    this.serviceForm.patchValue({
      categoryId: service.categoryId,
      name: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
      description: service.description || '',
      requiredToolsList: toolsStr
    });
    this.selectedFiles = null;
  }

  openAssign(service: any) {
    this.selectedService = service;
    this.showAssignForm = true;
    this.showAddForm = false;
    this.showEditForm = false;
    this.assignForm.reset();
  }

  closeForms() {
    this.showAddForm = false;
    this.showEditForm = false;
    this.showAssignForm = false;
    this.selectedService = null;
    this.serviceForm.reset();
  }

  onSubmit() {
    if (this.serviceForm.invalid) {
      this.toast.warning('Please fill all required fields before submitting.');
      return;
    }

    this.loading = true;
    
    // Parse tools list
    const toolsArray = this.serviceForm.value.requiredToolsList
      ? this.serviceForm.value.requiredToolsList.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '')
      : [];

    const formData = new FormData();
    formData.append('categoryId', this.serviceForm.value.categoryId || '');
    formData.append('name', this.serviceForm.value.name || '');
    formData.append('price', this.serviceForm.value.price?.toString() || '0');
    formData.append('durationMinutes', this.serviceForm.value.durationMinutes?.toString() || '60');
    formData.append('description', this.serviceForm.value.description || '');
    formData.append('requiredTools', JSON.stringify(toolsArray));

    if (this.selectedFiles) {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        formData.append('images', this.selectedFiles[i]);
      }
    }

    if (this.showAddForm) {
      this.http.post<any>('/api/services', formData).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Service listing created successfully!');
          this.closeForms();
          this.loadServices();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.error?.message || 'Failed to create service.');
        }
      });
    } else if (this.showEditForm && this.selectedService) {
      this.http.put<any>(`/api/services/${this.selectedService.id}`, formData).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Service listing updated successfully!');
          this.closeForms();
          this.loadServices();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.error?.message || 'Failed to update service.');
        }
      });
    }
  }

  onSubmitAssign() {
    if (this.assignForm.invalid || !this.selectedService) return;

    this.loading = true;
    const payload = {
      serviceId: this.selectedService.id,
      providerId: this.assignForm.value.providerId
    };

    this.http.post<any>('/api/services/assign', payload).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Service successfully assigned to partner!');
        this.closeForms();
        this.loadServices();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.error?.message || 'Failed to assign service.');
      }
    });
  }

  async deleteService(id: number) {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to delete this service listing?',
      'Yes, Delete',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.delete<any>(`/api/services/${id}`).subscribe({
      next: () => {
        this.toast.success('Service deleted successfully.');
        this.loadServices();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete service.');
      }
    });
  }

  formatTools(tools: any): string {
    if (!tools) return 'None';
    if (Array.isArray(tools)) return tools.join(', ');
    if (typeof tools === 'string') {
      try {
        const parsed = JSON.parse(tools);
        if (Array.isArray(parsed)) return parsed.join(', ');
        return tools;
      } catch {
        return tools;
      }
    }
    return 'None';
  }
}
