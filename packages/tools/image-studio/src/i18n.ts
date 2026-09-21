export interface ImageStudioTranslations {
  // Titles & Status Badges
  titleUpload: string
  titleCrop: string
  titleWatermark: string
  titleFormat: string

  // Top Bar StatsHeader
  labelSize: string
  labelFormat: string
  labelDims: string
  labelStatus: string
  statusReady: string
  statusSupported: string

  // Dropzone
  dropTitle: string
  dropSubtitle: string
  browseFiles: string
  demoImage: string

  // Toolbar & Common
  original: string
  showEdited: string
  holdForOriginal: string
  processing: string
  cropTab: string
  watermarkTab: string
  formatTab: string

  // Crop Tab
  aspectRatio: string
  presetOriginal: string
  presetIdPhoto: string
  presetSquare: string
  presetFourThree: string
  presetSixteenNine: string
  presetThreeTwo: string
  zoom: string
  centerCrop: string
  resetZoom: string
  passportGuide: string
  dragHint: string

  // Watermark Tab
  watermarkEnableLabel: string
  watermarkEnableDesc: string
  watermarkTextLabel: string
  watermarkPlaceholder: string
  layoutPattern: string
  patternDiagonal: string
  patternRepeat: string
  patternCorner: string
  opacity: string
  fontSize: string
  textColor: string
  colorWhite: string
  colorBlack: string
  colorRed: string
  colorYellow: string

  // Format Tab
  outputFormat: string
  quality: string
  targetFileSize: string
  budgetNone: string
  budgetHint: string

  // Bottom Controls
  download: string
  copy: string
  copied: string
  newImage: string
  reset: string
  loadError: string
}

export const imageStudioTranslations: Record<'en' | 'pl', ImageStudioTranslations> = {
  en: {
    titleUpload: 'UPLOAD & PROCESS IMAGES',
    titleCrop: 'CROP & ASPECT RATIO',
    titleWatermark: 'WATERMARK & PROTECTION',
    titleFormat: 'OUTPUT FORMAT & COMPRESSION',

    labelSize: 'SIZE',
    labelFormat: 'FORMAT',
    labelDims: 'DIMS',
    labelStatus: 'STATUS',
    statusReady: 'READY',
    statusSupported: 'SUPPORTED',

    dropTitle: 'Drop or browse image',
    dropSubtitle: 'JPG, PNG, WebP, AVIF & iPhone HEIC',
    browseFiles: 'Browse File',
    demoImage: 'Demo Image',

    original: 'Original',
    showEdited: 'Show Edited',
    holdForOriginal: 'Hold or toggle to preview original',
    processing: 'Processing…',
    cropTab: 'Crop',
    watermarkTab: 'Watermark',
    formatTab: 'Format & Size',

    aspectRatio: 'Aspect Ratio',
    presetOriginal: 'Original',
    presetIdPhoto: 'ID (7:9)',
    presetSquare: '1:1',
    presetFourThree: '4:3',
    presetSixteenNine: '16:9',
    presetThreeTwo: '3:2',
    zoom: 'Zoom',
    centerCrop: 'Center',
    resetZoom: 'Reset zoom',
    passportGuide: 'Biometric Face Guide',
    dragHint: 'Drag directly on the image preview to adjust framing.',

    watermarkEnableLabel: 'Watermark Protection',
    watermarkEnableDesc: 'Add copy notice or ownership stamp',
    watermarkTextLabel: 'Watermark text',
    watermarkPlaceholder: 'e.g. CONFIDENTIAL COPY',
    layoutPattern: 'Layout pattern',
    patternDiagonal: 'Diagonal 1×',
    patternRepeat: 'Repeat Grid',
    patternCorner: 'Corner',
    opacity: 'Opacity',
    fontSize: 'Font size',
    textColor: 'Text color',
    colorWhite: 'White',
    colorBlack: 'Black',
    colorRed: 'Red',
    colorYellow: 'Yellow',

    outputFormat: 'Output format',
    quality: 'Quality',
    targetFileSize: 'Target file size',
    budgetNone: 'None',
    budgetHint: 'Smart compression optimizes for highest quality fitting within budget.',

    download: 'Download',
    copy: 'Copy',
    copied: 'Copied',
    newImage: 'New',
    reset: 'Reset',
    loadError: 'Failed to load image file',
  },
  pl: {
    titleUpload: 'WGRAJ I PRZETWÓRZ ZDJĘCIA',
    titleCrop: 'KADROWANIE I PROPORCJE',
    titleWatermark: 'ZNAK WODNY I OCHRONA',
    titleFormat: 'FORMAT WYJŚCIOWY I KOMPRESJA',

    labelSize: 'ROZMIAR',
    labelFormat: 'FORMAT',
    labelDims: 'WYMIARY',
    labelStatus: 'STATUS',
    statusReady: 'GOTOWY',
    statusSupported: 'OBSŁUGA',

    dropTitle: 'Wybierz lub upuść zdjęcie',
    dropSubtitle: 'JPG, PNG, WebP, AVIF oraz HEIC z iPhone',
    browseFiles: 'Wybierz plik',
    demoImage: 'Zdjęcie demo',

    original: 'Oryginał',
    showEdited: 'Pokaż edycję',
    holdForOriginal: 'Przytrzymaj lub kliknij, aby podejrzeć oryginał',
    processing: 'Przetwarzanie…',
    cropTab: 'Kadr',
    watermarkTab: 'Znak wodny',
    formatTab: 'Format & Waga',

    aspectRatio: 'Proporcje kadru',
    presetOriginal: 'Oryginał',
    presetIdPhoto: 'Dowód (7:9)',
    presetSquare: '1:1',
    presetFourThree: '4:3',
    presetSixteenNine: '16:9',
    presetThreeTwo: '3:2',
    zoom: 'Zoom',
    centerCrop: 'Wyśrodkuj',
    resetZoom: 'Reset zoom',
    passportGuide: 'Zarys biometryczny twarzy',
    dragHint: 'Przeciągaj bezpośrednio po zdjęciu, aby precyzyjnie dopasować kadr.',

    watermarkEnableLabel: 'Znak wodny i ochrona',
    watermarkEnableDesc: 'Oznacz dokument klauzulą lub znakiem',
    watermarkTextLabel: 'Treść znaku',
    watermarkPlaceholder: 'np. KOPIA DLA BANKU',
    layoutPattern: 'Układ znaku',
    patternDiagonal: 'Przekątna 1×',
    patternRepeat: 'Siatka',
    patternCorner: 'Róg',
    opacity: 'Przezroczystość',
    fontSize: 'Rozmiar czcionki',
    textColor: 'Kolor tekstu',
    colorWhite: 'Biały',
    colorBlack: 'Czarny',
    colorRed: 'Czerwony',
    colorYellow: 'Żółty',

    outputFormat: 'Format wyjściowy',
    quality: 'Jakość kompresji',
    targetFileSize: 'Limit wagi pliku',
    budgetNone: 'Brak',
    budgetHint: 'Inteligentna kompresja dobiera najwyższą jakość mieszczącą się w limicie.',

    download: 'Pobierz',
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    newImage: 'Nowy',
    reset: 'Reset',
    loadError: 'Błąd wczytywania pliku graficznego',
  },
}
