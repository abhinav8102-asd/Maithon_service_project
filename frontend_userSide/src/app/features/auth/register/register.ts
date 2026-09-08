import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  public errorMessage: string | null = null;
  public successMessage: string | null = null;
  public loading = false;
  public showPassword = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  public registerForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(15)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Customer', [Validators.required]] // Default value Customer
  });

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message || 'Registration successful. Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please check details.';
      }
    });
  }
}
