export interface ImageStudioTranslations {
  // Titles & Status Badges
  titleUpload: string
  titleCrop: string
  titleWatermark: string
  titleFormat: string
  titleVectorize: string
  titleRemoveBg: string

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
  fromClipboard: string
  pasteImage: string
  demoImage: string
  noClipboardImage: string
  clipboardError: string

  // Toolbar & Common
  original: string
  showEdited: string
  holdForOriginal: string
  processing: string
  cropTab: string
  removeBgTab: string
  watermarkTab: string
  formatTab: string
  vectorizeTab: string

  // Remove BG Tab
  removeBgEnableLabel: string
  removeBgEnableDesc: string
  bgColorLabel: string
  pickFromImage: string
  pickingColor: string
  tolerance: string
  bgScope: string
  scopeContiguous: string
  scopeAll: string
  feather: string
  presetWhite: string
  presetBlack: string
  presetGreen: string

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
  guideTopOfHead: string
  guideEyeLevel: string
  guideChin: string
  dragHint: string

  // Watermark Tab
  watermarkEnableLabel: string
  watermarkEnableDesc: string
  watermarkTextLabel: string
  watermarkPlaceholder: string
  defaultWatermarkText: string
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

  // Vectorize Tab
  vectorizeHint: string
  vectorMode: string
  modeColor: string
  modeBW: string
  colorCount: string
  bwThreshold: string
  speckleFilter: string
  speckleHint: string
  curveSmoothing: string
  smoothLow: string
  smoothMedium: string
  smoothHigh: string
  advancedSection: string
  rightAngles: string
  lineFilter: string
  previewOriginal: string
  previewVector: string
  compareSideBySide: string
  compareToggle: string
  downloadSvg: string
  copySvg: string
  copiedSvg: string
  vectorizing: string
  vectorStats: string
  pathsCount: string
  vectorTime: string
  vectorError: string

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
    titleVectorize: 'RASTER TO SVG VECTORIZATION',
    titleRemoveBg: 'REMOVE BACKGROUND & TRANSPARENCY',

    labelSize: 'SIZE',
    labelFormat: 'FORMAT',
    labelDims: 'DIMS',
    labelStatus: 'STATUS',
    statusReady: 'READY',
    statusSupported: 'SUPPORTED',

    dropTitle: 'Drop or browse image',
    dropSubtitle: 'JPG, PNG, WebP, AVIF, HEIC or paste (Ctrl+V)',
    browseFiles: 'Browse File',
    fromClipboard: 'From Clipboard',
    pasteImage: 'Paste from Clipboard',
    demoImage: 'Demo Image',
    noClipboardImage: 'No image found in clipboard. You can also press Ctrl+V to paste.',
    clipboardError: 'Unable to access clipboard. Please grant clipboard permissions or use Ctrl+V.',

    original: 'Original',
    showEdited: 'Show Edited',
    holdForOriginal: 'Hold or toggle to preview original',
    processing: 'Processing…',
    cropTab: 'Crop',
    removeBgTab: 'Remove BG',
    watermarkTab: 'Watermark',
    formatTab: 'Format & Size',
    vectorizeTab: 'Vectorize',

    removeBgEnableLabel: 'Remove Background',
    removeBgEnableDesc: 'Erase background color and create transparent areas',
    bgColorLabel: 'Background Color',
    pickFromImage: 'Pick from Image',
    pickingColor: 'Click anywhere on the image…',
    tolerance: 'Color Tolerance',
    bgScope: 'Removal Scope',
    scopeContiguous: 'From Edges',
    scopeAll: 'All Pixels',
    feather: 'Edge Softening',
    presetWhite: 'White',
    presetBlack: 'Black',
    presetGreen: 'Green',

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
    guideTopOfHead: 'TOP OF HEAD',
    guideEyeLevel: 'EYE LEVEL',
    guideChin: 'CHIN',
    dragHint: 'Drag directly on the image preview to adjust framing.',

    watermarkEnableLabel: 'Watermark Protection',
    watermarkEnableDesc: 'Add copy notice or ownership stamp',
    watermarkTextLabel: 'Watermark text',
    watermarkPlaceholder: 'e.g. CONFIDENTIAL COPY',
    defaultWatermarkText: 'CONFIDENTIAL COPY',
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

    vectorizeHint:
      'Best suited for logos, icons, drawings, and scans. Photographs will produce a posterized effect and larger file size.',
    vectorMode: 'Trace mode',
    modeColor: 'Color',
    modeBW: 'Black & White',
    colorCount: 'Colors',
    bwThreshold: 'B&W threshold',
    speckleFilter: 'Speckle filter',
    speckleHint: 'Filters out noise specks smaller than this radius.',
    curveSmoothing: 'Curve smoothing',
    smoothLow: 'Sharp',
    smoothMedium: 'Balanced',
    smoothHigh: 'Smooth',
    advancedSection: 'Advanced settings',
    rightAngles: 'Right-angle corners',
    lineFilter: 'Line noise filter',
    previewOriginal: 'Original (Raster)',
    previewVector: 'Result (SVG)',
    compareSideBySide: 'Side by side',
    compareToggle: 'Toggle view',
    downloadSvg: 'Download SVG',
    copySvg: 'Copy SVG',
    copiedSvg: 'Copied SVG',
    vectorizing: 'Vectorizing in worker…',
    vectorStats: 'Vector stats',
    pathsCount: 'Paths',
    vectorTime: 'Render time',
    vectorError: 'Failed to vectorize image',

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
    titleVectorize: 'WEKTORYZACJA RASTRA DO SVG',
    titleRemoveBg: 'USUWANIE TŁA I PRZEZROCZYSTOŚĆ',

    labelSize: 'ROZMIAR',
    labelFormat: 'FORMAT',
    labelDims: 'WYMIARY',
    labelStatus: 'STATUS',
    statusReady: 'GOTOWY',
    statusSupported: 'OBSŁUGA',

    dropTitle: 'Wybierz lub upuść zdjęcie',
    dropSubtitle: 'JPG, PNG, WebP, AVIF, HEIC lub wklej (Ctrl+V)',
    browseFiles: 'Wybierz plik',
    fromClipboard: 'Ze schowka',
    pasteImage: 'Wklej ze schowka',
    demoImage: 'Zdjęcie demo',
    noClipboardImage: 'Brak obrazu w schowku. Możesz również użyć skrótu Ctrl+V.',
    clipboardError: 'Brak dostępu do schowka. Zezwól na dostęp lub użyj skrótu Ctrl+V.',

    original: 'Oryginał',
    showEdited: 'Pokaż edycję',
    holdForOriginal: 'Przytrzymaj lub kliknij, aby podejrzeć oryginał',
    processing: 'Przetwarzanie…',
    cropTab: 'Kadr',
    removeBgTab: 'Usuń tło',
    watermarkTab: 'Znak wodny',
    formatTab: 'Format & Waga',
    vectorizeTab: 'Wektoryzacja',

    removeBgEnableLabel: 'Usuwanie tła',
    removeBgEnableDesc: 'Usuń wybrany kolor tła i utwórz przezroczyste piksele',
    bgColorLabel: 'Kolor tła do usunięcia',
    pickFromImage: 'Pobierz z obrazu',
    pickingColor: 'Kliknij w dowolne miejsce obrazu…',
    tolerance: 'Tolerancja koloru',
    bgScope: 'Obszar usuwania',
    scopeContiguous: 'Od krawędzi',
    scopeAll: 'Cały obraz',
    feather: 'Zmiękczenie krawędzi',
    presetWhite: 'Biały',
    presetBlack: 'Czarny',
    presetGreen: 'Zielony',

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
    guideTopOfHead: 'CZUBEK GŁOWY',
    guideEyeLevel: 'LINIA OCZU',
    guideChin: 'BRODA',
    dragHint: 'Przeciągaj bezpośrednio po zdjęciu, aby precyzyjnie dopasować kadr.',

    watermarkEnableLabel: 'Znak wodny i ochrona',
    watermarkEnableDesc: 'Oznacz dokument klauzulą lub znakiem',
    watermarkTextLabel: 'Treść znaku',
    watermarkPlaceholder: 'np. KOPIA DLA BANKU',
    defaultWatermarkText: 'KOPIA DLA BANKU',
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

    vectorizeHint:
      'Najlepiej działa na logo, ikonach, rysunkach i skanach. Zdjęcia dadzą efekt posteryzacji i duży plik.',
    vectorMode: 'Tryb śledzenia',
    modeColor: 'Kolor',
    modeBW: 'Czarno-biały',
    colorCount: 'Liczba kolorów',
    bwThreshold: 'Próg czerni i bieli',
    speckleFilter: 'Filtr drobnych plamek',
    speckleHint: 'Ignoruje plamki i zakłócenia mniejsze niż zadana wielkość.',
    curveSmoothing: 'Wygładzanie krzywych',
    smoothLow: 'Ostre',
    smoothMedium: 'Zbalansowane',
    smoothHigh: 'Gładkie',
    advancedSection: 'Zaawansowane opcje',
    rightAngles: 'Kąty proste',
    lineFilter: 'Filtr linii szumowych',
    previewOriginal: 'Oryginał (Raster)',
    previewVector: 'Wynik (SVG)',
    compareSideBySide: 'Obok siebie',
    compareToggle: 'Przełącznik',
    downloadSvg: 'Pobierz SVG',
    copySvg: 'Kopiuj SVG',
    copiedSvg: 'Skopiowano SVG',
    vectorizing: 'Wektoryzowanie w tle…',
    vectorStats: 'Właściwości wektora',
    pathsCount: 'Liczba ścieżek',
    vectorTime: 'Czas generowania',
    vectorError: 'Błąd podczas wektoryzacji grafiki',

    download: 'Pobierz',
    copy: 'Kopiuj',
    copied: 'Skopiowano',
    newImage: 'Nowy',
    reset: 'Reset',
    loadError: 'Błąd wczytywania pliku graficznego',
  },
}
