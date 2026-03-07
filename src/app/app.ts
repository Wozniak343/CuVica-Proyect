import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ViewMode = 'registro' | 'recibo' | 'panel';
type MovementType = 'ingreso' | 'salida';

interface MovementFormModel {
  type: MovementType;
  fecha: string;
  hora: string;
  material: string;
  volqueta: string;
  conductor: string;
  placas: string;
  volumen: number | null;
  cliente: string;
  destino: string;
  obra: string;
  observaciones: string;
  despacha: string;
  recibe: string;
}

interface MovementRecord {
  id: number;
  type: MovementType;
  fecha: string;
  hora: string;
  material: string;
  volqueta: string;
  conductor: string;
  placas: string;
  volumen: number;
  cliente: string;
  destino: string;
  obra: string;
  observaciones: string;
  despacha: string;
  recibe: string;
  createdAt: string;
}

interface ReceiptModel {
  number: number;
  generatedAt: string;
  fecha: string;
  conductor: string;
  tipoVehiculo: string;
  placas: string;
  horaSalida: string;
  claseMateriales: string;
  obra: string;
  destino: string;
  cantidad: number;
  observaciones: string;
  despacha: string;
  recibe: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly localStorageKey = 'cuvica-control-produccion-v1';

  protected readonly pageMeta = {
    title: 'Flujo De Control De Produccion',
    contract: 'Contrato De Concesion EBO-141',
    year: '2025',
    pages: 'Pag. 13 - 15',
    phones: '3204910208 - 3144158066',
    emails: 'gerenciatecnica@cuvica.com - Cuvicasas@gmail.com',
    website: 'www.cuvica.com'
  };

  protected readonly materials = [
    'Recebo',
    'Triturado',
    'Arena',
    'Material mixto',
    'Otro'
  ];

  protected activeView: ViewMode = 'registro';
  protected pendingView: ViewMode | null = null;
  protected showSwitchDialog = false;

  protected movementForm: MovementFormModel = this.buildEmptyForm();
  protected records: MovementRecord[] = [];
  protected selectedReceiptRecordId: number | null = null;
  protected receiptPreview: ReceiptModel | null = null;
  protected generatedReceipt: ReceiptModel | null = null;
  protected receiptCounter = 1201;

  private formSnapshot = this.serializeForm(this.buildEmptyForm());

  constructor() {
    this.loadLocalState();
    this.formSnapshot = this.serializeForm(this.movementForm);
    this.updateReceiptPreview();
  }

  protected readonly procedureSteps = [
    {
      title: 'Registro de ingreso de material',
      details: [
        'En el punto de control se anota el volumen que ingresa al patio de acopio.',
        'Debe incluir fecha, tipo de material, numero de volqueta y volumen transportado.'
      ]
    },
    {
      title: 'Registro de salida de material',
      details: [
        'En el mismo punto de control se registra el volumen cargado y despachado.',
        'Debe especificar fecha, tipo de material, cliente de destino, numero de volqueta y volumen.'
      ]
    },
    {
      title: 'Consolidacion de datos',
      details: [
        'Los ingresos y salidas se organizan en un formato de registro diario.',
        'La informacion se traslada a la base de control de inventarios para reporte oficial.'
      ]
    },
    {
      title: 'Calculo de inventario disponible',
      details: [
        'Se calcula restando el volumen despachado al volumen de ingreso registrado.',
        'Formula: Inventario = Volumen ingresado - Volumen despachado.'
      ]
    },
    {
      title: 'Verificacion y trazabilidad',
      details: [
        'El responsable revisa periodicamente los registros para validar consistencia.',
        'Se conservan formatos firmados como respaldo para la ANM.'
      ]
    }
  ];

  protected readonly productionVariables = [
    {
      title: 'Volumen ingresado al patio (m3)',
      description:
        'Registrado al ingreso de volquetas. Define la cantidad extraida desde el frente de explotacion.'
    },
    {
      title: 'Volumen despachado o vendido (m3)',
      description:
        'Registrado en salida. Incluye tipo de material, cliente de destino y numero de volqueta.'
    },
    {
      title: 'Inventario de material en patio (m3)',
      description:
        'Corresponde a la diferencia entre material ingresado y despachado para validar existencia fisica.'
    },
    {
      title: 'Capacidad de volquetas (m3)',
      description:
        'Base de calculo por viaje. Debe ajustarse a la capacidad real verificada en campo.'
    },
    {
      title: 'Numero de viajes por periodo',
      description:
        'Permite consolidar volumenes diarios, semanales y mensuales por movimiento.'
    },
    {
      title: 'Control de levantamiento topografico',
      description:
        'La comparacion de MDT por fecha estima el volumen real extraido y valida los registros de transporte.'
    },
    {
      title: 'Produccion total del periodo (m3)',
      description: 'Formula general: Ptotal = sum(Volumen ingresado) - Inventario final.'
    },
    {
      title: 'Declaracion de regalias mineras',
      description:
        'La produccion consolidada soporta la liquidacion y pago a la ANM con trazabilidad completa.'
    },
    {
      title: 'Controles de consistencia',
      description:
        'Compara transporte, topografia y volumen autorizado para detectar desviaciones y asegurar cumplimiento.'
    }
  ];

  protected readonly consolidationSystem = [
    {
      title: 'Fuente de datos',
      details:
        'Punto de control de ingreso y salida: volumen (m3), tipo de material, numero de volqueta, fecha y cliente.'
    },
    {
      title: 'Registro y digitalizacion',
      details:
        'Captura diaria en formatos manuales y posterior digitalizacion en formatos de la Agencia Nacional de Mineria.'
    },
    {
      title: 'Consolidacion de informacion',
      details:
        'Integracion en base central, validacion de inconsistencias y calculo automatico de inventario disponible.'
    },
    {
      title: 'Reportes y analisis',
      details:
        'Generacion de reportes para control interno, cumplimiento PTO y entrega oficial de informacion a la ANM.'
    },
    {
      title: 'Seguridad y respaldo',
      details:
        'Almacenamiento seguro con copias periodicas para auditorias, revisiones y continuidad de la operacion.'
    }
  ];

  protected requestView(view: ViewMode): void {
    if (view === this.activeView) {
      return;
    }

    if (this.isFormDirty()) {
      this.pendingView = view;
      this.showSwitchDialog = true;
      return;
    }

    this.activeView = view;
  }

  protected discardAndSwitchView(): void {
    if (this.pendingView === null) {
      return;
    }

    this.resetForm();
    this.activeView = this.pendingView;
    this.pendingView = null;
    this.showSwitchDialog = false;
  }

  protected stayOnPage(): void {
    this.pendingView = null;
    this.showSwitchDialog = false;
  }

  protected saveMovement(): void {
    if (!this.isFormValid()) {
      return;
    }

    const nextRecord: MovementRecord = {
      id: Date.now(),
      type: this.movementForm.type,
      fecha: this.movementForm.fecha,
      hora: this.movementForm.hora,
      material: this.movementForm.material,
      volqueta: this.movementForm.volqueta.trim(),
      conductor: this.movementForm.conductor.trim(),
      placas: this.movementForm.placas.trim(),
      volumen: Number(this.movementForm.volumen ?? 0),
      cliente: this.movementForm.cliente.trim(),
      destino: this.movementForm.destino.trim(),
      obra: this.movementForm.obra.trim(),
      observaciones: this.movementForm.observaciones.trim(),
      despacha: this.movementForm.despacha.trim(),
      recibe: this.movementForm.recibe.trim(),
      createdAt: new Date().toISOString()
    };

    this.records = [nextRecord, ...this.records];
    this.selectLatestSalida();
    this.resetForm();
    this.persistLocalState();
  }

  protected deleteRecord(id: number): void {
    this.records = this.records.filter((record) => record.id !== id);

    if (this.selectedReceiptRecordId === id) {
      this.selectedReceiptRecordId = null;
    }

    this.updateReceiptPreview();
    this.persistLocalState();
  }

  protected useRecordForReceipt(id: number): void {
    this.selectedReceiptRecordId = id;
    this.activeView = 'recibo';
    this.updateReceiptPreview();
  }

  protected onReceiptSelectionChange(): void {
    this.updateReceiptPreview();
  }

  protected generateReceipt(): void {
    if (!this.receiptPreview) {
      return;
    }

    this.generatedReceipt = {
      ...this.receiptPreview,
      number: this.receiptCounter,
      generatedAt: new Date().toLocaleString('es-CO')
    };
    this.receiptCounter += 1;
    this.persistLocalState();
  }

  protected printReceipt(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.print();
  }

  protected resetForm(): void {
    const defaultType = this.movementForm.type;
    this.movementForm = {
      ...this.buildEmptyForm(),
      type: defaultType
    };
    this.formSnapshot = this.serializeForm(this.movementForm);
  }

  protected onMovementTypeChange(): void {
    if (this.movementForm.type === 'ingreso') {
      this.movementForm.cliente = '';
      this.movementForm.destino = '';
      this.movementForm.recibe = '';
    }
  }

  protected get totalIngreso(): number {
    return this.records
      .filter((record) => record.type === 'ingreso')
      .reduce((sum, record) => sum + record.volumen, 0);
  }

  protected get totalSalida(): number {
    return this.records
      .filter((record) => record.type === 'salida')
      .reduce((sum, record) => sum + record.volumen, 0);
  }

  protected get inventarioDisponible(): number {
    return this.totalIngreso - this.totalSalida;
  }

  protected get totalViajes(): number {
    return this.records.length;
  }

  protected get recordsByMaterial(): Array<{ material: string; ingreso: number; salida: number; inventario: number }> {
    const summary = new Map<string, { ingreso: number; salida: number }>();

    this.records.forEach((record) => {
      const current = summary.get(record.material) ?? { ingreso: 0, salida: 0 };
      if (record.type === 'ingreso') {
        current.ingreso += record.volumen;
      } else {
        current.salida += record.volumen;
      }
      summary.set(record.material, current);
    });

    return Array.from(summary.entries()).map(([material, values]) => ({
      material,
      ingreso: values.ingreso,
      salida: values.salida,
      inventario: values.ingreso - values.salida
    }));
  }

  protected get salidaRecords(): MovementRecord[] {
    return this.records.filter((record) => record.type === 'salida');
  }

  protected formatMovementType(value: MovementType): string {
    return value === 'ingreso' ? 'Ingreso' : 'Salida';
  }

  protected formatVolume(value: number): string {
    return `${value.toFixed(2)} m3`;
  }

  private buildEmptyForm(): MovementFormModel {
    return {
      type: 'ingreso',
      fecha: '',
      hora: '',
      material: '',
      volqueta: '',
      conductor: '',
      placas: '',
      volumen: null,
      cliente: '',
      destino: '',
      obra: '',
      observaciones: '',
      despacha: '',
      recibe: ''
    };
  }

  private isFormValid(): boolean {
    const hasBaseFields =
      this.movementForm.fecha.length > 0 &&
      this.movementForm.material.length > 0 &&
      this.movementForm.volqueta.trim().length > 0 &&
      this.movementForm.volumen !== null &&
      this.movementForm.volumen > 0;

    if (!hasBaseFields) {
      return false;
    }

    if (this.movementForm.type === 'salida') {
      return this.movementForm.destino.trim().length > 0;
    }

    return true;
  }

  private isFormDirty(): boolean {
    return this.serializeForm(this.movementForm) !== this.formSnapshot;
  }

  private serializeForm(value: MovementFormModel): string {
    return JSON.stringify(value);
  }

  private selectLatestSalida(): void {
    if (this.selectedReceiptRecordId) {
      return;
    }

    const firstSalida = this.salidaRecords[0];
    if (firstSalida) {
      this.selectedReceiptRecordId = firstSalida.id;
      this.updateReceiptPreview();
    }
  }

  private updateReceiptPreview(): void {
    const source = this.salidaRecords.find((record) => record.id === this.selectedReceiptRecordId);

    if (!source) {
      this.receiptPreview = null;
      return;
    }

    this.receiptPreview = {
      number: this.receiptCounter,
      generatedAt: '',
      fecha: source.fecha,
      conductor: source.conductor,
      tipoVehiculo: source.volqueta,
      placas: source.placas,
      horaSalida: source.hora,
      claseMateriales: source.material,
      obra: source.obra,
      destino: source.destino,
      cantidad: source.volumen,
      observaciones: source.observaciones,
      despacha: source.despacha,
      recibe: source.recibe || source.cliente
    };
  }

  private persistLocalState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const payload = {
      records: this.records,
      selectedReceiptRecordId: this.selectedReceiptRecordId,
      generatedReceipt: this.generatedReceipt,
      receiptCounter: this.receiptCounter
    };

    window.localStorage.setItem(this.localStorageKey, JSON.stringify(payload));
  }

  private loadLocalState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const rawData = window.localStorage.getItem(this.localStorageKey);

    if (!rawData) {
      return;
    }

    try {
      const parsed = JSON.parse(rawData) as {
        records?: MovementRecord[];
        selectedReceiptRecordId?: number | null;
        generatedReceipt?: ReceiptModel | null;
        receiptCounter?: number;
      };

      this.records = parsed.records ?? [];
      this.selectedReceiptRecordId = parsed.selectedReceiptRecordId ?? null;
      this.generatedReceipt = parsed.generatedReceipt ?? null;
      this.receiptCounter = parsed.receiptCounter ?? 1201;
    } catch {
      window.localStorage.removeItem(this.localStorageKey);
    }
  }
}
