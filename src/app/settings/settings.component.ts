import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; // Importe RouterLink
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox'; // Ou MatSlideToggleModule
import { MatCardModule } from '@angular/material/card'; // Para melhor layout
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';

import { FormulaService, Variable } from '../formula.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink, // Adicionado para o botão Voltar
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatCheckboxModule,
    MatCardModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  formulaForm!: FormGroup;
  variableForm!: FormGroup;
  variables: Variable[] = [];
  private subscriptions: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public formulaService: FormulaService, // Tornar público para usar no template
    private router: Router
  ) {}

  ngOnInit(): void {
    this.formulaForm = this.fb.group({
      formulaString: [this.formulaService.getFormula(), Validators.required]
    });

    this.variableForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)]], // Nomes de variáveis válidos
      value: [0, Validators.required],
      isVisualized: [true], // Por padrão, visualizável na tela inicial
      isConstant: [false]   // Por padrão, editável na tela inicial se visualizável
    });

    this.subscriptions.add(
      this.formulaService.variables$.subscribe(vars => {
        this.variables = vars;
      })
    );

    // Atualizar o formulário se a fórmula for alterada em outro lugar (improvável neste fluxo)
    this.subscriptions.add(
      this.formulaService.formula$.subscribe(formula => {
        if (this.formulaForm && this.formulaForm.get('formulaString')?.value !== formula) {
          this.formulaForm.get('formulaString')?.setValue(formula);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  saveFormula(): void {
    if (this.formulaForm.valid) {
      this.formulaService.setFormula(this.formulaForm.value.formulaString);
      // Adicionar feedback ao usuário (ex: Snackbar)
      this.snackBar.open('Fórmula salva: '+this.formulaForm.value.formulaString, 'Fechar', { duration: 3000 });
    }
  }

  addVariable(): void {
    if (this.variableForm.valid) {
      // Verificar se o nome da variável já existe
      const nameExists = this.variables.some(v => v.name.toLowerCase() === this.variableForm.value.name.toLowerCase());
      if (nameExists) {
        alert('Uma variável com este nome já existe.'); // Usar MatSnackBar para melhor UX
        this.variableForm.get('name')?.setErrors({ 'nameExists': true });
        return;
      }

      this.formulaService.addVariable({
        name: this.variableForm.value.name,
        value: this.variableForm.value.value,
        isVisualized: this.variableForm.value.isVisualized,
        isConstant: this.variableForm.value.isConstant
      });
      this.variableForm.reset({ name: '', value: 0, isVisualized: true, isConstant: false });
    }
  }

  updateVariableValue(variable: Variable, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    // Permitir string vazia temporariamente ou validar para número
    const newValue = inputElement.value;
    this.formulaService.updateVariable({ ...variable, value: newValue === '' ? '' : parseFloat(newValue) });
  }

  toggleVisualized(variable: Variable): void {
    const newIsVisualizedState = !variable.isVisualized;
    this.formulaService.updateVariable({
      ...variable,
      isVisualized: newIsVisualizedState
      // O valor de 'variable.value' é mantido.
      // Se newIsVisualizedState for true, o input de valor aqui será desabilitado,
      // e o valor será inserido na tela Home.
      // Se newIsVisualizedState for false, o input de valor aqui será habilitado.
    });
  }

  toggleConstant(variable: Variable): void {
    this.formulaService.updateVariable({ ...variable, isConstant: !variable.isConstant });
  }

  deleteVariable(variableId: string): void {
    if (confirm('Tem certeza que deseja excluir esta variável?')) { // Usar MatDialog para melhor UX
      this.formulaService.deleteVariable(variableId);
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}