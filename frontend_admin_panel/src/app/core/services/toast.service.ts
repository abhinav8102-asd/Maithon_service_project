import { Injectable, signal } from '@angular/core';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  id: number;
}

export interface ConfirmDialog {
  id: number;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  confirmDialog = signal<ConfirmDialog | null>(null);
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', duration = 3500) {
    const id = this.nextId++;
    const newToast: Toast = { message, type, id };
    this.toasts.update(current => [...current, newToast]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string, duration = 3500) { this.show(message, 'success', duration); }
  error(message: string, duration = 4500) { this.show(message, 'error', duration); }
  warning(message: string, duration = 4000) { this.show(message, 'warning', duration); }
  info(message: string, duration = 3500) { this.show(message, 'info', duration); }

  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  confirm(
    message: string,
    confirmText = 'Yes, Proceed',
    cancelText = 'Cancel'
  ): Promise<boolean> {
    return new Promise(resolve => {
      const id = this.nextId++;
      this.confirmDialog.set({ id, message, confirmText, cancelText, resolve });
    });
  }

  resolveConfirm(value: boolean) {
    const dialog = this.confirmDialog();
    if (dialog) {
      dialog.resolve(value);
      this.confirmDialog.set(null);
    }
  }
}
