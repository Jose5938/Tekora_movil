// Synthetic OpenAPI responses only; this does not test a live Laravel server.
const { chromium } = require(process.env.TEKORA_PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve, join, extname } = require('node:path');
const assert = require('node:assert/strict');
const root = resolve(process.env.TEKORA_WEB_PREVIEW_DIR || 'work/10a-web-preview');
const evidence = resolve(process.env.TEKORA_BROWSER_EVIDENCE_DIR || 'work/10a-browser-evidence');
mkdirSync(evidence, { recursive: true });
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.ttf':'font/ttf', '.woff2':'font/woff2', '.svg':'image/svg+xml' };
const server = createServer((req,res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  let file = path.startsWith(root) ? path : join(root,'index.html');
  if (existsSync(file) && statSync(file).isDirectory()) file=join(file,'index.html');
  if (!existsSync(file)) file=existsSync(file+'.html') ? file+'.html' : join(root,'index.html');
  res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');
  res.end(readFileSync(file));
});
const provider = { id:7, display_name:'Prestador de prueba', headline:'Soporte técnico', bio:'Diagnóstico y mantenimiento.' };
const service = { id:21, title:'Soporte de computadoras', description:'Diagnóstico remoto.', modality:'remote', category:{id:1,name:'Soporte técnico',slug:'soporte-tecnico'}, provider };
const meta = { current_page:1, per_page:12, last_page:1, total:1 };
let mode='normal';
let logins=0, logouts=0;
const requests=[];
const results=[];
(async () => {
  await new Promise(done=>server.listen(18080,'127.0.0.1',done));
  const browser=await chromium.launch({...(process.env.TEKORA_CHROMIUM_PATH ? { executablePath: process.env.TEKORA_CHROMIUM_PATH } : {}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  let page;
  const errors=[];
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://127.0.0.1:18013/api/v1/**',async route=>{
      const request=route.request();
      const path=new URL(request.url()).pathname.replace('/api/v1','');
      requests.push({path,method:request.method(),hasBearer:!!request.headers().authorization});
      let status=200, body;
      const error=(code,message,fields={})=>({error:{code,message,fields}});
      if(path==='/auth/login') {
        logins++;
        const input=request.postDataJSON();
        assert.deepEqual(Object.keys(input).sort(),['device_name','email','password']);
        assert.ok(input.device_name.length<=80);
        if(input.password==='incorrecta') {status=401;body=error('invalid_credentials','No se pudo iniciar sesión con los datos proporcionados.');}
        else if(input.password==='validation') {status=422;body=error('validation_failed','Revisa los datos.',{email:['Correo rechazado por el servidor.']});}
        else if(input.password==='limited') {status=429;body=error('too_many_requests','Demasiados intentos. Espera antes de reintentar.');}
        else body={data:{token_type:'Bearer',access_token:'synthetic-browser-token',expires_at:new Date(Date.now()+(input.password==='short-session'?3000:3600000)).toISOString(),user:{id:4,name:'Solicitante de prueba',email:'cliente@example.test',experience:'client',permissions:['client.appointments.view']}}};
      } else if(path==='/auth/logout') {logouts++;body={data:{revoked:true}};}
      else if(path==='/me') body={data:{id:4,name:'Solicitante de prueba',email:'cliente@example.test',experience:'client',permissions:['client.appointments.view']}};
      else if(mode==='offline') {await route.abort('failed');return;}
      else if(path==='/providers') body={data:mode==='empty'?[]:[provider],meta:{...meta,total:mode==='empty'?0:1}};
      else if(path==='/services') body={data:mode==='empty'?[]:[service],meta:{...meta,total:mode==='empty'?0:1}};
      else if(path==='/providers/7') body={data:provider};
      else if(path==='/services/21'&&mode!=='missing') body={data:service};
      else {status=404;body=error('not_found','El recurso no existe o no está publicado.');}
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    });
    const visible=async text=>page.getByText(text,{exact:true}).first().waitFor({state:'visible',timeout:15000});
    const signIn=async password=>{
      await page.getByLabel('Correo electrónico',{exact:true}).fill('cliente@example.test');
      await page.getByLabel('Contraseña',{exact:true}).fill(password);
      await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
    };
    for (const path of ['/tabs/cuenta','/tabs/chat','/tabs/reserva','/tabs/pago']) {
      await page.goto('http://127.0.0.1:18080'+path);
      await visible('Te damos la bienvenida a Tekora');
    }
    await visible('Te damos la bienvenida a Tekora');
    assert.equal(await page.getByText('Mi Perfil',{exact:true}).count(),0);
    results.push('Acceso directo privado sin sesión redirige a login sin identidad privada.');
    await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
    await visible('Ingresa un correo electrónico válido.');
    assert.equal(logins,0);
    await signIn('incorrecta');
    await visible('No se pudo iniciar sesión con los datos proporcionados.');
    await signIn('validation');
    await visible('Correo rechazado por el servidor.');
    await signIn('limited');
    await visible('Demasiados intentos. Espera antes de reintentar.');
    results.push('Validación local y errores 401, 422 y 429 del formulario.');
    await page.screenshot({path:join(evidence,'login-error.png'),fullPage:true});
    await signIn('válida-sintética');
    await visible('Expertos publicados');
    await visible('Prestador de prueba');
    await page.screenshot({path:join(evidence,'inicio-catalogo.png'),fullPage:true});
    const browserStorage=await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage),cookies:document.cookie}));
    assert.deepEqual(browserStorage,{local:[],session:[],cookies:''});
    results.push('Login correcto; inicio con identidad y prestadores del contrato; sin token persistido en navegador.');
    await page.getByText('Prestador de prueba',{exact:true}).click();
    await visible('Perfil del experto');
    await visible('Diagnóstico y mantenimiento.');
    assert.ok(requests.some(r=>r.path==='/providers/7'));
    await page.getByText('Solicitar servicio',{exact:true}).click();
    await visible('Solicitudes en preparación');
    await page.getByText('Entendido',{exact:true}).click();
    results.push('Perfil obtiene /providers/7; solicitar muestra explicación sin enviar operación.');
    await page.getByText('Servicios',{exact:true}).last().click();
    await visible('Soporte de computadoras');
    await page.getByText('Soporte de computadoras',{exact:true}).click();
    await visible('Detalle del servicio');
    await visible('Diagnóstico remoto.');
    assert.ok(requests.some(r=>r.path==='/services/21'));
    await page.screenshot({path:join(evidence,'detalle-servicio.png'),fullPage:true});
    results.push('Catálogo y detalle usan IDs reales /services/21 y muestran solo campos respaldados.');
    mode='missing';
    await page.getByLabel('Actualizar servicio',{exact:true}).click();
    await visible('El recurso no existe o no está publicado.');
    mode='normal';
    await page.getByText('Reintentar',{exact:true}).click();
    await visible('Diagnóstico remoto.');
    await page.getByLabel('Volver',{exact:true}).click();
    await visible('Soporte de computadoras');
    mode='empty';
    await page.getByLabel('Actualizar catálogo',{exact:true}).click();
    await visible('No hay resultados publicados para esta búsqueda.');
    mode='offline';
    await page.getByText('Reintentar',{exact:true}).click();
    await visible('No se pudo conectar con Tekora. Revisa tu conexión y reintenta.');
    mode='normal';
    await page.getByText('Reintentar',{exact:true}).click();
    await visible('Soporte de computadoras');
    results.push('404, catálogo vacío, pérdida de conexión y reintentos visibles.');
    await page.getByText('Mensajes',{exact:true}).click();
    await visible('Chat de demostración');
    assert.equal(await page.getByLabel('Envío en preparación',{exact:true}).isEnabled(),false);
    await page.getByText('Reservas en preparación',{exact:true}).click();
    await visible('RESERVAS EN PREPARACIÓN');
    assert.equal(await page.getByText('Chat en preparación',{exact:true}).isEnabled(),false);
    await page.getByText('Ver vista previa de pagos',{exact:true}).click();
    await visible('Sin reserva ni importe de pago');
    assert.equal(await page.getByText('Pagos en preparación',{exact:true}).isEnabled(),false);
    await page.screenshot({path:join(evidence,'pagos-en-preparacion.png'),fullPage:true});
    await page.getByText('Cancelar y volver a Tekora',{exact:true}).click();
    await visible('RESERVAS EN PREPARACIÓN');
    await page.goBack();
    await visible('Chat de demostración');
    await page.getByText('Mi cuenta',{exact:true}).click();
    await visible('cliente@example.test');
    await page.screenshot({path:join(evidence,'cuenta.png'),fullPage:true});
    await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
    await visible('Te damos la bienvenida a Tekora');
    assert.equal(logouts,1);
    assert.ok(requests.filter(r=>r.path==='/auth/logout').every(r=>r.hasBearer));
    results.push('Chat/reserva/pago bloquean operaciones; cuenta usa identidad real; logout envía POST Bearer.');
    await signIn('short-session');
    await visible('Expertos publicados');
    await visible('Te damos la bienvenida a Tekora');
    await visible('Tu sesión expiró. Inicia sesión de nuevo.');
    results.push('Expiración con pantalla abierta vuelve a login.');
    await signIn('válida-sintética');
    await visible('Expertos publicados');
    await page.reload();
    await visible('Te damos la bienvenida a Tekora');
    results.push('Recargar vista web exige login, sin almacenamiento inseguro.');
    assert.ok(requests.filter(r=>r.path.startsWith('/services')||r.path.startsWith('/providers')).every(r=>!r.hasBearer));
    assert.deepEqual(errors,[]);
    writeFileSync(join(evidence,'results.json'),JSON.stringify({results,requests,consolePageErrors:errors},null,2));
    console.log(JSON.stringify({passed:results.length,results,consolePageErrors:errors},null,2));
  } catch(error) {
    if(page) {await page.screenshot({path:join(evidence,'failure.png'),fullPage:true});console.log(JSON.stringify({requests,errors,body:await page.locator('body').innerText()},null,2));}
    throw error;
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
