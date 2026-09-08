import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './subscriptions.html',
  styleUrl: './subscriptions.css'
})
export class SubscriptionsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public packages = signal<any[]>([]);
  public showAddForm = false;
  public showEditForm = false;
  public selectedPackageForEdit: any = null;
  public loading = false;

  public packageForm = this.fb.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    durationDays: [30, [Validators.required, Validators.min(1)]],
    description: ['', Validators.required],
    maxServices: [2, [Validators.required, Validators.min(1)]],
    isFeatured: [false],
    status: ['Active', Validators.required]
  });

  ngOnInit() {
    this.loadPackages();
  }

  loadPackages() {
    this.http.get<any>('/api/admin/packages').subscribe({
      next: (res) => {
        if (res.success) {
          this.packages.set(res.data);
        }
      },
      error: (err) => {
        this.toast.error('Failed to load packages.');
      }
    });
  }

  openAdd() {
    this.showAddForm = true;
    this.showEditForm = false;
    this.packageForm.reset({
      name: '',
      price: 0,
      durationDays: 30,
      description: '',
      maxServices: 2,
      isFeatured: false,
      status: 'Active'
    });
  }

  openEdit(pkg: any) {
    this.selectedPackageForEdit = pkg;
    this.showEditForm = true;
    this.showAddForm = false;
    this.packageForm.patchValue({
      name: pkg.name,
      price: pkg.price,
      durationDays: pkg.durationDays,
      description: pkg.description,
      maxServices: pkg.maxServices,
      isFeatured: pkg.isFeatured,
      status: pkg.status
    });
  }

  closeForms() {
    this.showAddForm = false;
    this.showEditForm = false;
    this.selectedPackageForEdit = null;
    this.packageForm.reset();
  }

  onSubmit() {
    if (this.packageForm.invalid) {
      this.toast.warning('Please fix the validation errors in the form.');
      return;
    }

    this.loading = true;
    const body = this.packageForm.value;

    if (this.showAddForm) {
      this.http.post<any>('/api/admin/packages', body).subscribe({
        next: (res) => {
          this.loading = false;
          this.toast.success('Subscription package created successfully!');
          this.closeForms();
          this.loadPackages();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.error?.message || 'Failed to create package.');
        }
      });
    } else if (this.showEditForm && this.selectedPackageForEdit) {
      this.http.put<any>(`/api/admin/packages/${this.selectedPackageForEdit.id}`, body).subscribe({
        next: (res) => {
          this.loading = false;
          this.toast.success('Subscription package updated successfully!');
          this.closeForms();
          this.loadPackages();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.error?.message || 'Failed to update package.');
        }
      });
    }
  }

  async deletePackage(id: number) {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to delete this subscription package? This cannot be undone.',
      'Yes, Delete',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.delete<any>(`/api/admin/packages/${id}`).subscribe({
      next: (res) => {
        this.toast.success('Subscription package deleted successfully.');
        this.loadPackages();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete package.');
      }
    });
  }
}
