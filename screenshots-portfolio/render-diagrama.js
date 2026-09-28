const { chromium } = require('/Users/diogenesg.o/CLIENTES SAAS/node_modules/playwright');
const path = require('path'); const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  const f = 'file://' + path.join(__dirname, 'source', '06-architecture.html');
  await page.goto(f, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Comprobar que nada se sale de su caja antes de guardar.
  // Dos comprobaciones distintas: texto que rebosa su caja, y cajas que se
  // pisan entre sí. La segunda faltaba y dejó pasar un pie superpuesto.
  const problemas = await page.evaluate(() => {
    const malos = [];
    document.querySelectorAll('.col, .card, .note > div, footer, header').forEach((el) => {
      if (el.scrollHeight > el.clientHeight + 1) {
        malos.push((el.className || el.tagName) + ' desborda ' + (el.scrollHeight - el.clientHeight) + 'px');
      }
    });
    const bloques = [...document.querySelectorAll('.cols, .note, footer, header')];
    for (let i = 0; i < bloques.length; i++) {
      for (let j = i + 1; j < bloques.length; j++) {
        const a = bloques[i].getBoundingClientRect(), b = bloques[j].getBoundingClientRect();
        const solapa = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const cruza = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        if (solapa > 1 && cruza > 1) {
          malos.push('se solapan ' + (bloques[i].className || bloques[i].tagName) +
                     ' y ' + (bloques[j].className || bloques[j].tagName) +
                     ' (' + Math.round(solapa) + 'px)');
        }
      }
    }
    if (document.body.scrollWidth > 1400 + 1) malos.push('ancho +' + (document.body.scrollWidth - 1400));
    return malos;
  });

  // Ajustar el lienzo al contenido real para que no quede franja vacía abajo.
  const alto = await page.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
  await page.setViewportSize({ width: 1400, height: alto });
  await page.waitForTimeout(300);

  const salida = path.join(__dirname, 'raw', '06-architecture.png');
  await page.screenshot({ path: salida });
  console.log(`  06-architecture.png  2800x${alto*2}  ${Math.round(fs.statSync(salida).size/1024)} KB`);
  if (problemas.length) { console.log('  PROBLEMAS:'); problemas.forEach(d => console.log('   - ' + d)); }
  else console.log('  sin desbordes ni solapamientos');
  await browser.close();
})();
