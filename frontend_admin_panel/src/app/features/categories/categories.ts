import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class CategoriesComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  public categories = signal<any[]>([]);
  public showAddForm = false;
  public showEditForm = false;
  
  public selectedCategoryForEdit: any = null;
  public loading = false;

  public selectedIcon: File | null = null;
  public selectedBanner: File | null = null;

  public categoryForm = this.fb.group({
    name: ['', Validators.required],
    seoTitle: [''],
    seoDescription: [''],
    status: ['Enabled', Validators.required]
  });

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.http.get<any>('/api/categories').subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.data);
      },
      error: () => {
        this.toast.error('Failed to load categories.');
      }
    });
  }

  onIconSelected(event: any) {
    this.selectedIcon = event.target.files[0];
  }

  onBannerSelected(event: any) {
    this.selectedBanner = event.target.files[0];
  }

  openAdd() {
    this.showAddForm = true;
    this.showEditForm = false;
    this.categoryForm.reset({ status: 'Enabled' });
    this.selectedIcon = null;
    this.selectedBanner = null;
  }

  openEdit(cat: any) {
    this.selectedCategoryForEdit = cat;
    this.showEditForm = true;
    this.showAddForm = false;
    this.categoryForm.patchValue({
      name: cat.name,
      seoTitle: cat.seoTitle || '',
      seoDescription: cat.seoDescription || '',
      status: cat.status
    });
    this.selectedIcon = null;
    this.selectedBanner = null;
  }

  closeForms() {
    this.showAddForm = false;
    this.showEditForm = false;
    this.selectedCategoryForEdit = null;
    this.categoryForm.reset();
  }

  onSubmit() {
    if (this.categoryForm.invalid) {
      this.toast.warning('Please fill in all required fields.');
      return;
    }

    this.loading = true;
    const formData = new FormData();
    formData.append('name', this.categoryForm.value.name || '');
    formData.append('seoTitle', this.categoryForm.value.seoTitle || '');
    formData.append('seoDescription', this.categoryForm.value.seoDescription || '');
    formData.append('status', this.categoryForm.value.status || 'Enabled');

    if (this.selectedIcon) formData.append('icon', this.selectedIcon);
    if (this.selectedBanner) formData.append('banner', this.selectedBanner);

    if (this.showAddForm) {
      this.http.post<any>('/api/categories', formData).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Category created successfully!');
          this.closeForms();
          this.loadCategories();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.error?.message || 'Failed to create category.');
        }
      });
    } else if (this.showEditForm && this.selectedCategoryForEdit) {
      this.http.put<any>(`/api/categories/${this.selectedCategoryForEdit.id}`, formData).subscribe({
        next: () => {
          this.loading = false;
          this.toast.success('Category updated successfully!');
          this.closeForms();
          this.loadCategories();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.error?.message || 'Failed to update category.');
        }
      });
    }
  }

  async deleteCategory(id: number) {
    const confirmed = await this.toast.confirm(
      'Are you sure you want to delete this category? All service listings in this category will also be removed.',
      'Yes, Delete',
      'Cancel'
    );
    if (!confirmed) return;

    this.http.delete<any>(`/api/categories/${id}`).subscribe({
      next: () => {
        this.toast.success('Category deleted successfully.');
        this.loadCategories();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete category.');
      }
    });
  }
}
