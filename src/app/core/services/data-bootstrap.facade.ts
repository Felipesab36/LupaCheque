import { Injectable, inject } from '@angular/core';
import {
  AdminUser,
  BankAccount,
  BankAlert,
  ChatMessage,
  FirebaseData,
  SystemUser,
  UserPayment,
  VisitorUser,
} from '../../firebase-data';

export interface BootstrapData {
  admins: AdminUser[];
  visitors: VisitorUser[];
  banks: BankAccount[];
  alerts: BankAlert[];
  users: SystemUser[];
  conversations: ChatMessage[];
  payments: UserPayment[];
  iaConfig: Record<string, string> | null;
  integrations: Record<string, unknown> | null;
  fiscal: Record<string, unknown> | null;
}

@Injectable({
  providedIn: 'root',
})
export class DataBootstrapFacade {
  private firebaseData = inject(FirebaseData);

  private async seedBancosAlerts(): Promise<BankAlert[]> {
    const alerts: BankAlert[] = [
      {
        id: 'alert-1',
        suggestedBankName: 'bco pichoncha',
        accountNumber: '2100854711',
        userPhone: '+593998667525',
        createdAt: '2026-05-31T12:00:00Z',
      },
    ];

    for (const a of alerts) {
      await this.firebaseData.saveBankAlert(a);
    }

    return alerts;
  }

  private async seedUsersData(): Promise<SystemUser[]> {
    const users: SystemUser[] = [
      { phone: '+593998667525', activeSince: '2026-05-31T15:45:00Z', status: 'Gratis' },
    ];

    for (const u of users) {
      await this.firebaseData.saveUser(u);
    }

    return users;
  }

  private async seedPaymentsData(): Promise<UserPayment[]> {
    const payments: UserPayment[] = [
      {
        id: 'pay-1',
        userPhone: '+593998667525',
        paymentDate: '2026-06-01T08:00:00Z',
        amount: 15.0,
        currentBalance: 0.0,
        status: 'Pendiente',
      },
      {
        id: 'pay-2',
        userPhone: '+593998667525',
        paymentDate: '2026-05-31T10:00:00Z',
        amount: 25.0,
        currentBalance: 0.0,
        status: 'Correcto',
      },
    ];

    for (const p of payments) {
      await this.firebaseData.savePayment(p);
    }

    return payments;
  }

  private async seedAccounts(allBankNames: string[]): Promise<BankAccount[]> {
    const initialAccounts: BankAccount[] = [];

    const pichinchaAccs = [
      '2100014011',
      '2100101006',
      '2100202952',
      '2100300219',
      '2100211364',
      '2100295609',
      '3396217004',
      '2100018237',
      '2100333279',
      '3387972304',
      '3274225304',
      '2100203911',
    ];

    const seedMap: Record<string, string[]> = {
      'Banco Pichincha': pichinchaAccs,
      'Banco del Pacífico': ['08280479', '07793607'],
      Produbanco: ['02004016587'],
      'Banco Guayaquil': ['0015833149', '0015871059', '0045112764', '0015871130', '0035423621'],
      'Banco Internacional': ['0110026154', '4100048426', '0620623852', '0100622043', '3500616380'],
      'Banco Bolivariano': ['3015002900', '1205026695'],
      'Banco del Austro': ['0417760784'],
      'Banco de Loja': ['2900373022'],
    };

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const today = now.toISOString();

    let queryIdCounter = 1;
    const uniqueBanks = Array.from(new Set(allBankNames));

    for (const bankName of uniqueBanks) {
      const accs = seedMap[bankName] || [];
      for (const accNum of accs) {
        const acc: BankAccount = {
          id: `${bankName.replace(/\s+/g, '_')}_${accNum}`,
          accountNumber: accNum,
          bankName,
          createdAt: yesterday,
          queries: [
            {
              id: `q-${queryIdCounter++}`,
              queryDate: yesterday,
              userPhone: '+593998667525',
              status: 'Cobrado',
              fechaCobro: yesterday,
            },
            {
              id: `q-${queryIdCounter++}`,
              queryDate: today,
              userPhone: '+593998667525',
              status: 'Cobrado',
              fechaCobro: today,
            },
          ],
        };

        initialAccounts.push(acc);
        await this.firebaseData.saveBank(acc);
      }
    }

    return initialAccounts;
  }

  private normalizeLegacyModel(integrations: Record<string, unknown>): Record<string, unknown> {
    const model = integrations['geminiModel'];

    if (model === 'gemini-2.1-flash' || model === 'gemini-3.5-flash' || model === 'gemini-1.5-flash') {
      return { ...integrations, geminiModel: 'gemini-2.5-flash' };
    }

    if (model === 'gemini-2.1-pro' || model === 'gemini-3.1-pro-preview' || model === 'gemini-1.5-pro') {
      return { ...integrations, geminiModel: 'gemini-2.5-pro' };
    }

    return integrations;
  }

  async loadInitialData(allBankNames: string[]): Promise<BootstrapData> {
    const admins = await this.firebaseData.getAdmins();
    const visitors = await this.firebaseData.getVisitors();

    const banksFromDb = await this.firebaseData.getBanks();
    const banks = banksFromDb.length > 0 ? banksFromDb : await this.seedAccounts(allBankNames);

    const alertsFromDb = await this.firebaseData.getBankAlerts();
    const alerts = alertsFromDb.length > 0 ? alertsFromDb : await this.seedBancosAlerts();

    const usersFromDb = await this.firebaseData.getUsers();
    let users = usersFromDb.length > 0 ? usersFromDb : await this.seedUsersData();

    if (!users.some((u) => u.phone === '+593999999999')) {
      await this.firebaseData.saveUser({
        phone: '+593999999999',
        activeSince: new Date().toISOString(),
        status: 'Gratis',
      });
      users = await this.firebaseData.getUsers();
    }

    const conversations = await this.firebaseData.getConversations();

    const paymentsFromDb = await this.firebaseData.getPayments();
    const payments = paymentsFromDb.length > 0 ? paymentsFromDb : await this.seedPaymentsData();

    const iaConfig = (await this.firebaseData.getSettings('ia')) as Record<string, string> | null;

    const rawIntegrations = (await this.firebaseData.getSettings('integrations')) as Record<string, unknown> | null;
    const integrations = rawIntegrations ? this.normalizeLegacyModel(rawIntegrations) : null;

    const fiscal = (await this.firebaseData.getSettings('fiscal')) as Record<string, unknown> | null;

    return {
      admins,
      visitors,
      banks,
      alerts,
      users,
      conversations,
      payments,
      iaConfig,
      integrations,
      fiscal,
    };
  }
}
