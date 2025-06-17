import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Variable {
  id: string;
  name: string;
  value: number | string;
  isVisualized: boolean;
  isConstant: boolean;
}

const DEFAULT_FORMULA = '((Largura * 3 * Tecido) + (Largura * Trilho) + (Largura * Costureira) + (Largura * Acessorios) + Combustivel + Montagem + ((Largura * Backout) + (0.5 * Backout)) + (-Largura * 3 * Entretela)) * Adicional';

const DEFAULT_VARIABLES: Omit<Variable, 'id'>[] = [
  { name: 'Largura', value: 0, isVisualized: true, isConstant: false },
  { name: 'Altura', value: 0, isVisualized: true, isConstant: false },
  { name: 'Adicional', value: 2.3, isVisualized: false, isConstant: true },
  { name: 'Tecido', value: 48, isVisualized: false, isConstant: true },
  { name: 'Trilho', value: 15.2, isVisualized: false, isConstant: true },
  { name: 'Costureira', value: 80, isVisualized: false, isConstant: true },
  { name: 'Acessorios', value: 7, isVisualized: false, isConstant: true },
  { name: 'Combustivel', value: 50, isVisualized: false, isConstant: true },
  { name: 'Montagem', value: 60, isVisualized: false, isConstant: true },
  { name: 'Backout', value: 45, isVisualized: false, isConstant: true },
  { name: 'Entretela', value: 1.98, isVisualized: false, isConstant: true },
];

@Injectable({
  providedIn: 'root'
})
export class FormulaService {
  private isBrowser: boolean;

  private formulaSubject: BehaviorSubject<string>;
  formula$: Observable<string>;

  private variablesSubject: BehaviorSubject<Variable[]>;
  variables$: Observable<Variable[]>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.formulaSubject = new BehaviorSubject<string>(this.loadFormula());
    this.variablesSubject = new BehaviorSubject<Variable[]>(this.loadVariables());

    this.formula$ = this.formulaSubject.asObservable();
    this.variables$ = this.variablesSubject.asObservable();
  }

  private loadFormula(): string {
    if (this.isBrowser) {
      const savedFormula = localStorage.getItem('calculatorFormula');
      try {
        if(savedFormula) {
          const parseSavedFormula = JSON.parse(savedFormula)
          if(parseSavedFormula.trim() === '') {
            return DEFAULT_FORMULA
          } else {
            return parseSavedFormula
          }
        } else {
          return DEFAULT_FORMULA
        }
      } catch (e) {
        console.error('Erro ao parsear fórmula do localStorage', e);
        localStorage.removeItem('calculatorFormula');
        return DEFAULT_FORMULA;
      }
    }
    return DEFAULT_FORMULA;
  }

  private saveFormula(formula: string): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem('calculatorFormula', JSON.stringify(formula));
      } catch (e) {
        console.error('Erro ao salvar fórmula no localStorage', e);
      }
    }
  }

  private loadVariables(): Variable[] {
    if (this.isBrowser) {
      const savedVariablesString = localStorage.getItem('calculatorVariables');
      if (savedVariablesString) {
        try {
          const parsedVariables = JSON.parse(savedVariablesString) as any[];
          if(parsedVariables.length === 0) return this.createDefaultVariables();

          return parsedVariables.map((v: any) => ({
            id: v.id || Date.now().toString() + Math.random().toString(36).substring(2, 7),
            name: v.name || '',
            value: v.value === undefined ? 0 : v.value,
            isVisualized: v.isVisualized === undefined ? true : v.isVisualized,
            isConstant: v.isConstant === undefined ? false : v.isConstant,
          })).filter(v => v.name);
        } catch (e) {
          console.error('Erro ao parsear variáveis do localStorage', e);
          localStorage.removeItem('calculatorVariables');
          return this.createDefaultVariables();
        }
      }
      return this.createDefaultVariables();
    }
    return this.createDefaultVariables();
  }

  private createDefaultVariables(): Variable[] {
    const variablesWithIds = DEFAULT_VARIABLES.map(v => ({
      ...v,
      id: Date.now().toString() + v.name + Math.random().toString(36).substring(2, 7)
    }));
    this.saveVariables(variablesWithIds);
    return variablesWithIds;
  }

  private saveVariables(variables: Variable[]): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem('calculatorVariables', JSON.stringify(variables));
      } catch (e) {
        console.error('Erro ao salvar variáveis no localStorage', e);
      }
    }
  }

  getFormula(): string {
    return this.formulaSubject.getValue();
  }

  setFormula(formula: string): void {
    this.formulaSubject.next(formula);
    this.saveFormula(formula);
  }

  getVariables(): Variable[] {
    return this.variablesSubject.getValue();
  }

  // Omit agora inclui 'isConstant' pois será parte de 'variableData'
  addVariable(variableData: Omit<Variable, 'id'>): void {
    const currentVariables = this.getVariables();
    const newVariable: Variable = {
      ...variableData, // name, value, isVisualized, isConstant vêm daqui
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7)
    };
    const updatedVariables = [...currentVariables, newVariable];
    this.variablesSubject.next(updatedVariables);
    this.saveVariables(updatedVariables);
  }

  updateVariable(updatedVariable: Variable): void {
    const currentVariables = this.getVariables();
    const index = currentVariables.findIndex(v => v.id === updatedVariable.id);
    if (index > -1) {
      const updatedVariablesList = [...currentVariables];
      updatedVariablesList[index] = updatedVariable; // updatedVariable já deve ter isConstant
      this.variablesSubject.next(updatedVariablesList);
      this.saveVariables(updatedVariablesList);
    }
  }

  deleteVariable(variableId: string): void {
    const currentVariables = this.getVariables();
    const updatedVariables = currentVariables.filter(v => v.id !== variableId);
    this.variablesSubject.next(updatedVariables);
    this.saveVariables(updatedVariables);
  }

  clearAll(): void {
    this.setFormula('');
    this.variablesSubject.next([]);
    this.saveVariables([]);
  }
}