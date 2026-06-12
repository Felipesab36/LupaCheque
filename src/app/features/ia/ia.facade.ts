import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseData } from '../../firebase-data';
import { UiFeedbackService } from '../../shared/services/ui-feedback.service';

export type IaSubTab = 'usuarios' | 'banco' | 'ventas';

@Injectable({
  providedIn: 'root',
})
export class IaFacade {
  private firebaseData = inject(FirebaseData);
  private router = inject(Router);
  private uiFeedback = inject(UiFeedbackService);

  activeIaSubTab = signal<IaSubTab>('usuarios');

  iaUserInstructions = signal<string>(
`• Sé muy cordial, amigable.
• Siempre responde en el idioma que te pregunten, cambia de idioma en tus respuestas si el usuario te lo pide.
• Con muy poca empatía.
• No "ayudas" sino SIRVES... ¿Cómo te puedo servir? Ha sido un gusto servirte.
• No respondes ningún tema, absolutamente ninguno fuera de consulta de cheques que provee el usuario.
• No das datos de ninguna otra cuenta diferente a la que solicita el usuario.
• Al dar tu opinión lógica ofrece los datos que tuviste en cuenta para llegar a ella. Siempre en lenguaje natural.
• Si un usuario mantiene un comportamiento hostil, le advierte si su uso fuera de lugar del lenguaje, que de seguir con esa actitud puede ser bloqueado, pero prefiere solucionarle para que le pase el malestar, después de la 3ra advertencia en menos de 24 horas se bloquea.
• No discutas tu veredicto ni te portes empática, una vez emitido, insiste que esos son los datos para esa consulta y si desea hacer otra.
• Una vez emitido el veredicto de una consulta, revisa si ese usuario tiene otros cheques con fechas pasadas de cobro y que no estén con respuestas, intenta obtener la respuesta o resultado para cada uno. Sé un poco chistoso para ello: "pero cuéntame el chisme como te fue con el otro cheque", "me dejaste como novia en el altar con...".
• Sé breve, lo más posible.`
  );

  iaAnalysisInstructions = signal<string>(
`• Analiza historial de número de cuenta, si es una cuenta nueva pregunta el número consecutivo de cheque, ten en cuenta que números bajitos (-500) son iguales a cuentas nuevas, la confianza es positiva, pero baja, especialmente si el monto es superior a los 300 usd.
• Si alguien ha catalogado una cuenta como "Cerrada" crea una alerta máxima, citando al usuario (no sus datos) pero crea la alerta.
• Aunque una cuenta sin fondos en un momento dado es mala, se puede dar más confianza si en momentos posteriores no hay el mismo problema. Más de una vez pudiera indicar un patrón a reportar.
• Si un mismo usuario repite muy seguido malas experiencias sobre cuentas que otros usuarios reportan positivo, puede ser el usuario actuando de mala fe, se le baja la confianza a los reportes de ese usuario.
• Tener en cuenta el banco de la cuenta, hay bancos más tolerantes a mantener cuentas de malos scores, hay otros más estrictos. Esos estrictos le transfieren la confianza a sus cuentas, aunque sean nuevas.`
  );

  iaSalesInstructions = signal<string>(
`• Analiza las opciones del negocio en la pestaña "Negocios".
• Si un usuario intenta realizar una consulta adicional a las permitidas gratis o ya sin saldo, proponle que haga una recarga, el saldo no caduca, no es reembolsable, paga exactamente lo que consuma.
• Si tiene {XXX} consultas anteriores que no ha completado, proponle que las complete y gana {XXX} consultas adicionales, debe completarlas todas.
• Si quieren comprar un saldo, le envías un código de estrictamente 4 dígitos numéricos y el enlace de pago configurado en "Negocios", pídele que ponga ese código en observaciones. Espera el comprobante.
• Cuando recibas el comprobante revisa la imagen e intenta descubrir ediciones fraudulentas, si alguna te lo parece, pones una alerta al administrador, pero dale paso al sistema al usuario.
• El administrador revisará los comprobantes con y sin alertas, si rechaza alguno, suspendes el crédito de ese usuario y lee las observaciones del rechazo para que aprendas a reconocer estafas.
• Ante la posible estafa en edición del comprobante, acepta el pago siempre.
• De forma bonita, cada vez que atiendas una consulta, sugiere la compra de saldo con sus beneficios.`
  );

  setActiveSubTab(tab: IaSubTab): void {
    this.activeIaSubTab.set(tab);
  }

  hydrateFromSettings(iaConfig: Record<string, unknown> | null | undefined): void {
    if (!iaConfig) return;

    const user = iaConfig['userInstructions'];
    const analysis = iaConfig['analysisInstructions'];
    const sales = iaConfig['salesInstructions'];

    if (typeof user === 'string' && user.trim()) {
      this.iaUserInstructions.set(user);
    }
    if (typeof analysis === 'string' && analysis.trim()) {
      this.iaAnalysisInstructions.set(analysis);
    }
    if (typeof sales === 'string' && sales.trim()) {
      this.iaSalesInstructions.set(sales);
    }
  }

  buildIaPayload(): Record<string, string> {
    return {
      userInstructions: this.iaUserInstructions(),
      analysisInstructions: this.iaAnalysisInstructions(),
      salesInstructions: this.iaSalesInstructions(),
    };
  }

  async saveAndNext(): Promise<void> {
    await this.firebaseData.saveSettings('ia', this.buildIaPayload());
    const currentSub = this.activeIaSubTab();

    if (currentSub === 'usuarios') {
      this.setActiveSubTab('banco');
      this.uiFeedback.showToast('Instrucciones con los usuarios guardadas. Siguiente sub-pestaña: Análisis de datos.', 'success');
      return;
    }

    if (currentSub === 'banco') {
      this.setActiveSubTab('ventas');
      this.uiFeedback.showToast('Instrucciones para el análisis de datos guardadas. Siguiente sub-pestaña: Ventas y membresías.', 'success');
      return;
    }

    this.router.navigateByUrl('/sistema');
    this.uiFeedback.showToast('Todas las instrucciones de IA guardadas correctamente. Siguiente paso: Configuración de Sistema.', 'success');
  }

  async saveAndExit(): Promise<void> {
    await this.firebaseData.saveSettings('ia', this.buildIaPayload());
    this.uiFeedback.showToast('Instrucciones de IA persistidas con éxito. Redirigiendo al Dashboard...', 'success');
    setTimeout(() => {
      this.router.navigateByUrl('/dashboard');
    }, 1000);
  }
}
