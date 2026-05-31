import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  addDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface AdminUser {
  id?: string;
  email: string;
  twoFactor: boolean;
  createdAt?: string;
}

export interface VisitorUser {
  id?: string;
  email: string;
  validFrom: string;
  validTo: string;
  twoFactor: boolean;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseData {
  private platformId = inject(PLATFORM_ID);

  private handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // --- Administrators CRUD ---
  async getAdmins(): Promise<AdminUser[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [{ email: 'emprende@biia-dots.com', twoFactor: false }];
    }
    const path = 'admins';
    try {
      const q = collection(db, path);
      const snapshot = await getDocs(q);
      const list: AdminUser[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AdminUser);
      });

      // Ensure that emprende@biia-dots.com is ALWAYS in the list
      if (!list.some(a => a.email.toLowerCase() === 'emprende@biia-dots.com')) {
        list.unshift({ email: 'emprende@biia-dots.com', twoFactor: false });
      }
      return list;
    } catch (error) {
      // If error is permissions (e.g., if user is not authorized yet), fallback gracefully with default
      console.warn('Fallback to local admins due to:', error);
      return [{ email: 'emprende@biia-dots.com', twoFactor: false }];
    }
  }

  async saveAdmin(admin: AdminUser): Promise<void> {
    const path = 'admins';
    try {
      const colRef = collection(db, path);
      if (admin.id) {
        // Update
        const docRef = doc(db, path, admin.id);
        await setDoc(docRef, {
          email: admin.email,
          twoFactor: admin.twoFactor,
          createdAt: admin.createdAt || new Date().toISOString()
        });
      } else {
        // Create
        await addDoc(colRef, {
          email: admin.email,
          twoFactor: admin.twoFactor,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async deleteAdmin(id: string): Promise<void> {
    const path = `admins/${id}`;
    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- Visitors CRUD ---
  async getVisitors(): Promise<VisitorUser[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    const path = 'visitors';
    try {
      const q = collection(db, path);
      const snapshot = await getDocs(q);
      const list: VisitorUser[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as VisitorUser);
      });
      return list;
    } catch (error) {
      console.warn('Fallback to empty visitors due to:', error);
      return [];
    }
  }

  async saveVisitor(visitor: VisitorUser): Promise<void> {
    const path = 'visitors';
    try {
      const colRef = collection(db, path);
      if (visitor.id) {
        // Update
        const docRef = doc(db, path, visitor.id);
        await setDoc(docRef, {
          email: visitor.email,
          validFrom: visitor.validFrom,
          validTo: visitor.validTo,
          twoFactor: visitor.twoFactor,
          createdAt: visitor.createdAt || new Date().toISOString()
        });
      } else {
        // Create
        await addDoc(colRef, {
          email: visitor.email,
          validFrom: visitor.validFrom,
          validTo: visitor.validTo,
          twoFactor: visitor.twoFactor,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async deleteVisitor(id: string): Promise<void> {
    const path = `visitors/${id}`;
    try {
      await deleteDoc(doc(db, 'visitors', id));
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}
