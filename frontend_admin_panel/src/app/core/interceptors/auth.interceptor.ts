import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  let apiReq = req;

  // Prepend base API URL dynamically if request path is relative
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    const baseUrl = environment.apiUrl;
    const cleanUrl = req.url.startsWith('/') ? req.url : '/' + req.url;
    apiReq = req.clone({
      url: `${baseUrl}${cleanUrl}`
    });
  }
  
  if (token) {
    apiReq = apiReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  apiReq = apiReq.clone({
    withCredentials: true
  });

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !apiReq.url.includes('/login') && !apiReq.url.includes('/refresh')) {
        return handle401Error(apiReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

const handle401Error = (req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<unknown>> => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refresh().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(res.accessToken);
        
        return next(req.clone({
          setHeaders: {
            Authorization: `Bearer ${res.accessToken}`
          }
        }));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.clearSession();
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        return next(req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        }));
      })
    );
  }
};
