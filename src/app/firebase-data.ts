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

export interface BankQuery {
  id: string;
  queryDate: string;
  userPhone: string;
  status: 'Cobrado' | 'Rechazado' | 'En espera' | 'No reportado' | 'Cuenta cerrada' | 'Pendiente de confirmación';
  fechaCobro?: string;
  facturaUrl?: string;
}

export interface BankAccount {
  id?: string;
  accountNumber: string;
  bankName: string;
  createdAt: string;
  queries: BankQuery[];
}

export interface BankAlert {
  id: string;
  suggestedBankName: string;
  accountNumber: string;
  userPhone: string;
  createdAt: string;
  resolved?: boolean;
}

export interface SystemUser {
  id?: string;
  phone: string;
  activeSince: string;
  status: 'Gratis' | 'Pagado' | 'Bloqueado';
  hasFraudAlert?: boolean;
}

export interface UserPayment {
  id?: string;
  userPhone: string;
  paymentDate: string;
  amount: number;
  currentBalance: number;
  status: 'Pendiente' | 'Correcto' | 'Rechazado (Sin fondos)';
  rejectReason?: string;
  receiptUrl?: string;
  paymentDateFormatted?: string;
  paymentDateRaw?: number;
}

export interface ChatMessage {
  id?: string;
  userPhone: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
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
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AdminUser);
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
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as VisitorUser);
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

  // --- Banks CRUD ---
  async getBanks(): Promise<BankAccount[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const q = collection(db, 'banks');
      const snapshot = await getDocs(q);
      const list: BankAccount[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as BankAccount);
      });
      return list;
    } catch (error) {
      console.warn('Fallback to local banks due to:', error);
      return [];
    }
  }

  async saveBank(bank: BankAccount): Promise<void> {
    const path = 'banks';
    try {
      if (bank.id) {
        await setDoc(doc(db, path, bank.id), { ...bank });
      } else {
        await addDoc(collection(db, path), { ...bank });
      }
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async deleteBank(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'banks', id));
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, `banks/${id}`);
    }
  }

  // --- Bank Alerts CRUD ---
  async getBankAlerts(): Promise<BankAlert[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const snapshot = await getDocs(collection(db, 'bank_alerts'));
      const list: BankAlert[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as BankAlert);
      });
      return list;
    } catch {
      return [];
    }
  }

  async saveBankAlert(alert: BankAlert): Promise<void> {
    try {
      if (alert.id) {
        await setDoc(doc(db, 'bank_alerts', alert.id), { ...alert });
      } else {
        await addDoc(collection(db, 'bank_alerts'), { ...alert });
      }
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, 'bank_alerts');
    }
  }

  async deleteBankAlert(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'bank_alerts', id));
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, `bank_alerts/${id}`);
    }
  }

  // --- Users CRUD ---
  async getUsers(): Promise<SystemUser[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list: SystemUser[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SystemUser);
      });
      return list;
    } catch {
      return [];
    }
  }

  async saveUser(user: SystemUser): Promise<void> {
    try {
      if (user.id) {
        await setDoc(doc(db, 'users', user.id), { ...user });
      } else if (user.phone) {
        // Use phone as ID for consistency in this app
        await setDoc(doc(db, 'users', user.phone), { ...user });
      } else {
        await addDoc(collection(db, 'users'), { ...user });
      }
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  }

  // --- Payments CRUD ---
  async getPayments(): Promise<UserPayment[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const snapshot = await getDocs(collection(db, 'payments'));
      const list: UserPayment[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as UserPayment);
      });
      return list;
    } catch {
      return [];
    }
  }

  async savePayment(payment: UserPayment): Promise<void> {
    try {
      if (payment.id) {
        await setDoc(doc(db, 'payments', payment.id), { ...payment });
      } else {
        await addDoc(collection(db, 'payments'), { ...payment });
      }
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, 'payments');
    }
  }

  // --- Settings (Singleton Documents) ---
  async getSettings(id: string): Promise<unknown | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const res = await getDocs(collection(db, 'settings'));
      const specificDoc = res.docs.find(d => d.id === id);
      return specificDoc ? specificDoc.data()['data'] : null;
    } catch {
      return null;
    }
  }

  async saveSettings(id: string, data: unknown): Promise<void> {
    const path = `settings/${id}`;
    try {
      await setDoc(doc(db, 'settings', id), {
        data,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // --- Conversations (Chat Logs) ---
  async getConversations(): Promise<ChatMessage[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const q = collection(db, 'conversations');
      const snapshot = await getDocs(q);
      const list: ChatMessage[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return list;
    } catch {
      return [];
    }
  }

  async saveChatMessage(msg: ChatMessage): Promise<void> {
    const path = 'conversations';
    try {
      await addDoc(collection(db, path), {
        userPhone: msg.userPhone,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp || new Date().toISOString()
      });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async deleteConversations(phone: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const q = collection(db, 'conversations');
      const snapshot = await getDocs(q);
      const batchPromises: Promise<void>[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data['userPhone'] === phone) {
          batchPromises.push(deleteDoc(doc(db, 'conversations', docSnap.id)));
        }
      });
      await Promise.all(batchPromises);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, `conversations/query_for_${phone}`);
    }
  }
}
