export interface PdfSuiteTranslations {
  // Steps & Headers
  stepUpload: string
  stepMerge: string
  stepPages: string
  stepSign: string
  stepImages: string

  // Titles
  titleUpload: string
  titleMerge: string
  titleOrganize: string
  titleImages: string

  // Top Stats Header
  headerPdfSuite: string
  labelFiles: string
  labelPages: string
  labelImages: string
  labelSize: string
  labelStep: string

  // Dropzone
  dropTitle: string
  dropSubtitle: string
  browseFiles: string
  demoDocument: string
  demoLoaded: string

  // File Merge Queue
  mergeQueueTitle: string
  mergeQueueHint: string
  mergeAndContinue: string
  moveUp: string
  moveDown: string
  remove: string
  addMore: string

  // Page Grid
  pagesCount: string
  selectAll: string
  deselectAll: string
  rotateAll90: string
  rotatePage90: string
  moveLeft: string
  moveRight: string
  pagePrefix: string
  dragHint: string

  // Signature Dialog
  signDocument: string
  signModeDraw: string
  signModeType: string
  drawHint: string
  typeNamePlaceholder: string
  chooseStyle: string
  signatureStyle1: string
  signatureStyle2: string
  signatureStyle3: string
  signatureStyle4: string
  clearSignature: string
  targetPage: string
  lastPage: string
  firstPage: string
  pageNumber: string
  positionLabel: string
  positionBottomRight: string
  positionBottomLeft: string
  positionBottomCenter: string
  positionTopRight: string
  positionCenter: string
  positionCustom: string
  scaleLabel: string
  scaleSmall: string
  scaleNormal: string
  scaleLarge: string
  scaleExtraLarge: string
  manualPlacementHint: string
  placementPreviewTitle: string
  dragToMoveHint: string
  createSignatureTitle: string
  placeSignatureTitle: string
  nextStepPlacement: string
  backToSignature: string
  applySignature: string
  cancel: string
  signatureAppliedNotice: string

  // Actions
  exportPdf: string
  exporting: string
  downloaded: string
  reset: string
  errorReading: string
  errorGenerating: string
  selectAtLeastOnePage: string
}

export const pdfSuiteTranslations: Record<'en' | 'pl', PdfSuiteTranslations> = {
  en: {
    stepUpload: 'Upload',
    stepMerge: 'Merge',
    stepPages: 'Organize',
    stepSign: 'Sign',
    stepImages: 'Images',

    titleUpload: 'Upload & Process Documents',
    titleMerge: 'Reorder & Merge Documents',
    titleOrganize: 'Organize, Rotate & Sign Pages',
    titleImages: 'Convert Images to PDF Document',

    headerPdfSuite: 'PDF SUITE',
    labelFiles: 'FILES',
    labelPages: 'PAGES',
    labelImages: 'IMAGES',
    labelSize: 'SIZE',
    labelStep: 'STEP',

    dropTitle: 'Drop PDF files or images here',
    dropSubtitle: '100% client-side in your browser — zero cloud upload, fully private',
    browseFiles: 'Browse Files',
    demoDocument: 'Demo Document',
    demoLoaded: 'Sample document loaded',

    mergeQueueTitle: 'Arrange Document Order',
    mergeQueueHint: 'Files will be merged in the order shown below. Reorder with arrows before continuing.',
    mergeAndContinue: 'Merge & Open Workspace',
    moveUp: 'Move Up',
    moveDown: 'Move Down',
    remove: 'Remove',
    addMore: '+ Add Files',

    pagesCount: 'pages',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    rotateAll90: 'Rotate All 90°',
    rotatePage90: 'Rotate 90°',
    moveLeft: 'Move Left',
    moveRight: 'Move Right',
    pagePrefix: 'Page',
    dragHint: 'Drag pages or use arrows to reorder',

    signDocument: 'Sign Document',
    signModeDraw: 'Draw Signature',
    signModeType: 'Type Name',
    drawHint: 'Draw your signature inside the box using mouse, finger or pen',
    typeNamePlaceholder: 'Type your full name...',
    chooseStyle: 'Choose handwriting style:',
    signatureStyle1: 'Elegant Script',
    signatureStyle2: 'Casual Handwriting',
    signatureStyle3: 'Modern Cursive',
    signatureStyle4: 'Classic Calligraphy',
    clearSignature: 'Clear',
    targetPage: 'Place on page:',
    lastPage: 'Last Page',
    firstPage: 'First Page',
    pageNumber: 'Page',
    positionLabel: 'Position:',
    positionBottomRight: 'Bottom Right',
    positionBottomLeft: 'Bottom Left',
    positionBottomCenter: 'Bottom Center',
    positionTopRight: 'Top Right',
    positionCenter: 'Center',
    positionCustom: 'Manual Position',
    scaleLabel: 'Scale (%):',
    scaleSmall: '75% (Small)',
    scaleNormal: '100% (Normal)',
    scaleLarge: '125% (Large)',
    scaleExtraLarge: '150% (Extra Large)',
    manualPlacementHint: 'Click anywhere on the document or drag the signature box to place it',
    placementPreviewTitle: 'Position on Document',
    dragToMoveHint: 'Drag signature to adjust position',
    createSignatureTitle: 'Create Signature',
    placeSignatureTitle: 'Place Signature on Document',
    nextStepPlacement: 'Next: Place on Document →',
    backToSignature: '← Back to Signature',
    applySignature: 'Apply Signature',
    cancel: 'Cancel',
    signatureAppliedNotice: 'Signature applied to page',

    exportPdf: 'Export PDF',
    exporting: 'Processing...',
    downloaded: 'Downloaded',
    reset: 'Reset',
    errorReading: 'Failed to read PDF file',
    errorGenerating: 'Failed to generate PDF document',
    selectAtLeastOnePage: 'Please select at least one page to export',
  },
  pl: {
    stepUpload: 'Wgraj',
    stepMerge: 'Scalanie',
    stepPages: 'Strony',
    stepSign: 'Podpisz',
    stepImages: 'Zdjęcia',

    titleUpload: 'Wgraj i przetwórz dokumenty',
    titleMerge: 'Ustal kolejność i scal dokumenty',
    titleOrganize: 'Układaj, obracaj i podpisuj strony',
    titleImages: 'Konwertuj zdjęcia do pliku PDF',

    headerPdfSuite: 'PDF SUITE',
    labelFiles: 'PLIKI',
    labelPages: 'STRONY',
    labelImages: 'ZDJĘCIA',
    labelSize: 'ROZMIAR',
    labelStep: 'KROK',

    dropTitle: 'Upuść pliki PDF lub zdjęcia tutaj',
    dropSubtitle: '100% lokalnie w przeglądarce — bez wysyłania do chmury, pełna prywatność',
    browseFiles: 'Wybierz pliki',
    demoDocument: 'Dokument demo',
    demoLoaded: 'Wczytano dokument testowy',

    mergeQueueTitle: 'Ustal kolejność plików do scalenia',
    mergeQueueHint: 'Pliki zostaną połączone w kolejności poniżej. Użyj strzałek, aby zmienić kolejność.',
    mergeAndContinue: 'Połącz i otwórz strony',
    moveUp: 'W górę',
    moveDown: 'W dół',
    remove: 'Usuń',
    addMore: '+ Dodaj pliki',

    pagesCount: 'stron',
    selectAll: 'Wszystkie',
    deselectAll: 'Odznacz',
    rotateAll90: 'Obróć wszystkie 90°',
    rotatePage90: 'Obróć 90°',
    moveLeft: 'W lewo',
    moveRight: 'W prawo',
    pagePrefix: 'Str.',
    dragHint: 'Przeciągnij strony lub użyj strzałek, aby zmienić układ',

    signDocument: 'Podpisz dokument',
    signModeDraw: 'Narysuj podpis',
    signModeType: 'Wpisz imię i nazwisko',
    drawHint: 'Złóż podpis w ramce za pomocą myszy, palca lub rysika',
    typeNamePlaceholder: 'Wpisz swoje imię i nazwisko...',
    chooseStyle: 'Wybierz styl pisma:',
    signatureStyle1: 'Elegancka inskrypcja',
    signatureStyle2: 'Odręczny styl',
    signatureStyle3: 'Nowoczesna kursywa',
    signatureStyle4: 'Klasyczna kaligrafia',
    clearSignature: 'Wyczyść',
    targetPage: 'Wstaw na stronę:',
    lastPage: 'Ostatnia strona',
    firstPage: 'Pierwsza strona',
    pageNumber: 'Strona',
    positionLabel: 'Pozycja:',
    positionBottomRight: 'Prawy dolny róg',
    positionBottomLeft: 'Lewy dolny róg',
    positionBottomCenter: 'Środek na dole',
    positionTopRight: 'Prawy górny róg',
    positionCenter: 'Środek',
    positionCustom: 'Własna pozycja (ręczna)',
    scaleLabel: 'Skala (%):',
    scaleSmall: '75% (Mały)',
    scaleNormal: '100% (Normalny)',
    scaleLarge: '125% (Duży)',
    scaleExtraLarge: '150% (Bardzo duży)',
    manualPlacementHint: 'Kliknij w dowolnym miejscu dokumentu lub przeciągnij podpis, aby go umieścić',
    placementPreviewTitle: 'Pozycja na dokumencie',
    dragToMoveHint: 'Przeciągnij podpis, aby dostosować położenie',
    createSignatureTitle: 'Stwórz podpis',
    placeSignatureTitle: 'Umieść podpis na dokumencie',
    nextStepPlacement: 'Dalej: Umieść na dokumencie →',
    backToSignature: '← Wróć do podpisu',
    applySignature: 'Zatwierdź podpis',
    cancel: 'Anuluj',
    signatureAppliedNotice: 'Podpis dodany do strony',

    exportPdf: 'Pobierz PDF',
    exporting: 'Generowanie...',
    downloaded: 'Pobrano',
    reset: 'Wyczyść',
    errorReading: 'Błąd podczas odczytu pliku PDF',
    errorGenerating: 'Błąd podczas generowania pliku PDF',
    selectAtLeastOnePage: 'Zaznacz co najmniej jedną stronę do eksportu',
  },
}
