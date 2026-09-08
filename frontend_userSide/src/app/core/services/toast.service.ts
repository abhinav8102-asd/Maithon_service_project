import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export interface ConfirmDialog {
  id: number;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  confirmDialog = signal<ConfirmDialog | null>(null);
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3500) {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string, duration = 3500) { this.show(message, 'success', duration); }
  error(message: string, duration = 4000) { this.show(message, 'error', duration); }
  warning(message: string, duration = 4000) { this.show(message, 'warning', duration); }
  info(message: string, duration = 3500) { this.show(message, 'info', duration); }

  remove(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
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
