import { Injectable } from '@angular/core';
import { APP_TRANSLATIONS, AppLanguage } from '../i18n/translations';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  t(language: AppLanguage, key: string): string {
    return APP_TRANSLATIONS[language][key] || key;
  }
}
