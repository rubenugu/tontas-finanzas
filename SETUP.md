# Configuración de Tontas Finanzas

## 1. Google Apps Script (una vez)

1. Abre tu Google Sheet de finanzas
2. Ve a **Extensiones → Apps Script**
3. Borra el código que hay y pega esto:

```javascript
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('MOVIMIENTOS');
  var d = JSON.parse(e.postData.contents);

  // Primera fila vacía después de los headers (fila 2)
  var colA = sheet.getRange('A3:A1000').getValues();
  var firstEmpty = 3;
  for (var i = 0; i < colA.length; i++) {
    if (colA[i][0] !== '') {
      firstEmpty = i + 4;
    } else {
      break;
    }
  }

  sheet.getRange(firstEmpty, 1, 1, 11).setValues([[
    new Date(d.fecha),
    d.tipo,
    d.categoria,
    d.subcategoria,
    d.monto,
    d.tarjeta,
    d.nota || '',
    d.aMeses ? 'Sí' : 'No',
    d.mesesRestantes || '',
    d.pagoMensualMSI || '',
    d.idMSI || ''
  ]]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Haz clic en **Implementar → Nueva implementación**
5. Tipo: **Aplicación web**
6. Ejecutar como: **Yo (tu cuenta)**
7. Quién tiene acceso: **Cualquier persona**
8. Clic en **Implementar** → Autoriza los permisos
9. Copia la **URL de la aplicación web** (termina en `/exec`)

---

## 2. Anthropic API Key (para la función de dictado con IA)

1. Ve a [console.anthropic.com](https://console.anthropic.com) → **API Keys** → crea una nueva
2. Cópiala

---

## 3. Configurar variables de entorno

Edita `.env.local` con tus dos valores:

```
APPS_SCRIPT_URL=https://script.google.com/macros/s/TU_ID_REAL/exec
ANTHROPIC_API_KEY=sk-ant-TU_KEY_REAL
```

---

## 4. Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

---

## 5. Deploy en Vercel

1. Sube el proyecto a GitHub
2. En [vercel.com](https://vercel.com), importa el repositorio
3. En **Settings → Environment Variables**, agrega **ambas** variables:
   - `APPS_SCRIPT_URL` → tu URL de Apps Script
   - `ANTHROPIC_API_KEY` → tu API key de Anthropic
4. Despliega

La app estará disponible en tu URL de Vercel para usar desde el celular.
