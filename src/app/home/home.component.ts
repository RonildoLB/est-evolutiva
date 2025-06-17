import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

import { FormulaService, Variable } from '../formula.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  calculatorForm!: FormGroup;
  formulaString: string = '';
  visualizedVariables: Variable[] = [];
  calculationResult: number | string | null = null;
  calculationError: string | null = null;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private formulaService: FormulaService
  ) {}

  ngOnInit(): void {
    this.calculatorForm = this.fb.group({}); // Inicializa vazio

    this.subscriptions.add(
      this.formulaService.formula$.subscribe(formula => {
        this.formulaString = formula;
      })
    );

    this.subscriptions.add(
      this.formulaService.variables$.subscribe(vars => {
        this.visualizedVariables = vars.filter(v => v.isVisualized);
        this.buildForm(); // Reconstrói o formulário quando as variáveis mudam
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private buildForm(): void {
    const group: { [key: string]: AbstractControl } = {};
    this.visualizedVariables.forEach(variable => {
      if (!variable.isConstant) { // Apenas adiciona controles para variáveis não constantes
        group[variable.name] = this.fb.control(variable.value || '', Validators.required);
      }
    });
    this.calculatorForm = this.fb.group(group);
  }

  calculate(): void {
    this.calculationResult = null;
    this.calculationError = null;

    if (!this.formulaString) {
      this.calculationError = 'Nenhuma fórmula definida. Configure na tela de Configurações.';
      return;
    }

    if (this.calculatorForm.invalid) {
      this.calculationError = 'Por favor, preencha todos os campos.';
      // Marcar todos os campos como tocados para exibir erros de validação
      Object.values(this.calculatorForm.controls).forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    const variableValues: { [key: string]: number } = {};

    // Coletar valores das variáveis (constantes e da tela inicial)
    this.formulaService.getVariables().forEach(v => {
      if (v.isVisualized && !v.isConstant) {
        // Variável visualizável e editável na tela inicial
        const controlValue = this.calculatorForm.get(v.name)?.value;
        variableValues[v.name] = parseFloat(controlValue);
      } else {
        // Variável constante (valor de settings) ou não visualizável (usa valor de settings)
         variableValues[v.name] = parseFloat(String(v.value));
      }
    });


    // **AVISO: Avaliação de Expressão Perigosa com `eval` ou `new Function`**
    // A abordagem abaixo usando `new Function` é mais segura que `eval` direto, mas ainda
    // pode ser vulnerável se os nomes das variáveis não forem estritamente controlados.
    // Para uma aplicação real, considere usar uma biblioteca de parsing matemático segura (ex: math.js).

    try {
      const variableNames = Object.keys(variableValues);
      const variableVals = Object.values(variableValues);

      // Validar se todas as variáveis na fórmula existem e têm valores numéricos
      for (const name of variableNames) {
        if (this.formulaString.includes(name) && isNaN(variableValues[name])) {
           throw new Error(`Valor inválido para a variável '${name}'.`);
        }
      }
      // Verificar se a fórmula contém apenas caracteres permitidos (variáveis, números, operadores, parênteses)
      // Esta é uma validação MUITO SIMPLES e pode precisar ser mais robusta.
      const allowedCharsRegex = /^[a-zA-Z0-9_+\-*/().\s]+$/;
      if (!allowedCharsRegex.test(this.formulaString)) {
        throw new Error('A fórmula contém caracteres inválidos.');
      }

      // Substituir nomes de variáveis na fórmula para garantir que são tratados como tal
      let formulaToEvaluate = this.formulaString;
      // Ordenar por comprimento do nome da variável decrescente para evitar substituições parciais (ex: "var" em "variable")
      const sortedVariableNames = [...variableNames].sort((a, b) => b.length - a.length);

      for (const name of sortedVariableNames) {
        // Usar regex para substituir apenas nomes de variáveis inteiros (evitar substituições parciais)
        // A palavra-chave 'this' não é permitida para evitar acesso ao escopo global
        if (name.toLowerCase() === 'this') throw new Error("Nome de variável 'this' não é permitido.");

        const regex = new RegExp(`\\b${name}\\b`, 'g');
        // Garantir que o valor é um número antes de colocar na string da função
        const numericValue = parseFloat(String(variableValues[name]));
        if (isNaN(numericValue)) {
          throw new Error(`Valor para a variável '${name}' não é um número válido.`);
        }
        formulaToEvaluate = formulaToEvaluate.replace(regex, numericValue.toString());
      }

      // Remover quaisquer nomes de variáveis que não foram substituídos se eles não forem números
      // (Isso pode indicar uma variável não definida sendo usada na fórmula)
      // Regex para encontrar palavras que não sejam números ou operadores básicos
      const remainingWordsRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
      const remainingVars = formulaToEvaluate.match(remainingWordsRegex);
      if (remainingVars && remainingVars.some(word => isNaN(parseFloat(word)))) {
        const undefinedVar = remainingVars.find(word => isNaN(parseFloat(word)));
        throw new Error(`Variável '${undefinedVar}' não definida ou usada incorretamente na fórmula.`);
      }


      // Usar o construtor Function é mais seguro que eval direto
      // mas AINDA requer cuidado extremo com as entradas.
      const func = new Function(`'use strict'; return (${formulaToEvaluate})`);
      this.calculationResult = func();

      if (typeof this.calculationResult !== 'number' || isNaN(this.calculationResult)) {
        throw new Error('O resultado da fórmula não é um número válido.');
      }

    } catch (e: any) {
      console.error("Erro ao calcular fórmula:", e);
      this.calculationError = `Erro ao calcular: ${e.message || 'Fórmula ou valores inválidos.'}`;
      this.calculationResult = null;
    }
  }
}