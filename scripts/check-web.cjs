// Synthetic OpenAPI responses only; this does not test a live Laravel server.
const { chromium } = require(process.env.TEKORA_PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve, join, extname } = require('node:path');
const assert = require('node:assert/strict');
const { inquiry, journey, collection } = require('../tests/fixtures/inquiries.cjs');
const { id: quoteId, getQuote, getQuoteJourney } = require('../tests/fixtures/quotes.cjs');
const { availability, options, getReservation, getContext, getReservationJourney } = require('../tests/fixtures/reservations.cjs');
const { instant, conversation, notification, cursor, readToken, ownMessage, messagePage } = require('../tests/fixtures/communications.cjs');
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
let inquiryCreated=false, inquiryReadMode='normal', inquiryPosts=0;
let quotePhase=false, quoteIssued=false, quoteAccepted=false, acceptancePosts=0;
const issueKeys=[];
let reservationStatus=null, proposals=0, cancellations=0, readinessState='web_checkout_required';
const commitKeys=[];
const proposalKeys=[];
let messagesRead=false, messageSent=false, noticeRead=false;
const messageKeys=[];
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
    let redirectRequests = 0;
    await page.route('http://127.0.0.1:18013/downgraded', async route => {
      redirectRequests++;
      await route.abort();
    });
    await page.route('https://tekora-api.example.test/api/v1/**',async route=>{
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
        if(input.password==='redirect') {
          await route.fulfill({status:307,headers:{
            'Access-Control-Allow-Origin':'http://127.0.0.1:18080',
            Location:'http://127.0.0.1:18013/downgraded',
          }});
          return;
        }
        if(input.password==='incorrecta') {status=401;body=error('invalid_credentials','No se pudo iniciar sesión con los datos proporcionados.');}
        else if(input.password==='validation') {status=422;body=error('validation_failed','Revisa los datos.',{email:['Correo rechazado por el servidor.']});}
        else if(input.password==='limited') {status=429;body=error('too_many_requests','Demasiados intentos. Espera antes de reintentar.');}
        else body={data:{token_type:'Bearer',access_token:'synthetic-browser-token',expires_at:new Date(Date.now()+(input.password==='short-session'?3000:3600000)).toISOString(),user:{id:4,name:'Solicitante de prueba',email:'cliente@example.test',experience:'client',permissions:['client.appointments.view','client.inquiries.manage']}}};
      } else if(path==='/auth/logout') {logouts++;body={data:{revoked:true}};}
      else if(path==='/me') body={data:{id:4,name:'Solicitante de prueba',email:'cliente@example.test',experience:'client',permissions:['client.appointments.view','client.inquiries.manage']}};
      else if(path==='/services/21/inquiries') {
        inquiryPosts++;
        assert.equal(request.method(),'POST');
        assert.ok(request.headers().authorization);
        const input=request.postDataJSON();
        assert.deepEqual(Object.keys(input),['message']);
        if(input.message==='El servidor rechaza este texto.') {
          status=422;body=error('validation_failed','Revisa los datos.',{message:['Revisa la descripción enviada.']});
        } else if(input.message==='No se podrá verificar esta solicitud.') {
          status=503;body=error('temporarily_unavailable','El resultado no se pudo verificar.');
        } else {
          assert.equal(input.message,inquiry.message);
          status=inquiryCreated?200:201;
          inquiryCreated=true;
          body={data:inquiry};
        }
      }
      else if(path==='/inquiries') {
        assert.ok(request.headers().authorization);
        body=inquiryCreated?collection:{...collection,data:[],meta:{...collection.meta,total:0}};
      }
      else if(path==='/conversations') {
        assert.ok(request.headers().authorization);
        body={data:[{...conversation,unread_messages_count:messagesRead?0:1}],meta:collection.meta};
      }
      else if(path==='/inquiries/42/messages/read') {
        assert.ok(request.headers().authorization);
        assert.deepEqual(request.postDataJSON(),{read_token:readToken});
        messagesRead=true;
        body={data:{inquiry_id:42,last_read_message_id:3}};
      }
      else if(path==='/inquiries/42/messages') {
        assert.ok(request.headers().authorization);
        if(request.method()==='POST') {
          const { idempotency_key, ...input }=request.postDataJSON();
          assert.deepEqual(input,{body:ownMessage.body});
          assert.match(idempotency_key,/^[0-9a-f-]{36}$/i);
          messageKeys.push(idempotency_key);
          if(messageKeys.length===1) {status=503;body=error('temporarily_unavailable','No se pudo verificar el envío.');}
          else {status=201;messageSent=true;body={data:ownMessage};}
        } else {
          const currentCursor=new URL(request.url()).searchParams.get('messages_cursor');
          assert.ok(currentCursor===null || currentCursor===cursor || currentCursor==='newer-fixture');
          body=messagePage(messagesRead,messageSent,currentCursor===cursor);
        }
      }
      else if(path==='/notifications' || path==='/notifications/unread-count' || path==='/notifications/inquiry/42/read') {
        assert.ok(request.headers().authorization);
        if(path.endsWith('/read')) {
          assert.deepEqual(request.postDataJSON(),{});
          noticeRead=true;
          body={data:{...notification,read_at:instant}};
        } else if(path.endsWith('/unread-count')) body={data:{unread_count:noticeRead?0:1}};
        else body={data:[{...notification,read_at:noticeRead?instant:null}],meta:collection.meta};
      }
      else if(path==='/services/21/availability') {
        assert.equal(request.headers().authorization,undefined);
        body={data:availability};
      }
      else if(path==='/inquiries/42/reservation-options') {
        assert.ok(request.headers().authorization);
        body={data:options};
      }
      else if(path==='/inquiries/42/reservations') {
        assert.ok(request.headers().authorization);
        assert.equal(request.method(),'POST');
        const { idempotency_key, ...proposal }=request.postDataJSON();
        assert.deepEqual(proposal,{date:'2026-11-23',time:'10:00',availability_revision:11,quote_id:quoteId});
        assert.match(idempotency_key,/^[0-9a-f-]{36}$/i);
        proposalKeys.push(idempotency_key);
        proposals++;
        if(proposals===1) {
          status=503;body=error('temporarily_unavailable','No se pudo verificar la propuesta.');
        } else {
          reservationStatus='requested';
          status=201;body={data:getReservation()};
        }
      }
      else if(path==='/reservations/17/commit') {
        assert.ok(request.headers().authorization);
        assert.equal(request.method(),'PATCH');
        const { idempotency_key, ...intent }=request.postDataJSON();
        assert.match(idempotency_key,/^[0-9a-f-]{36}$/i);
        assert.deepEqual(intent,{version:8});
        commitKeys.push(idempotency_key);
        if(commitKeys.length===1) {
          status=503;body=error('temporarily_unavailable','No se pudo verificar la confirmación.');
        } else {
          reservationStatus='confirmed';body={data:getReservation(reservationStatus)};
        }
      }
      else if(path==='/reservations/17/cancel') {
        assert.ok(request.headers().authorization);
        assert.equal(request.method(),'PATCH');
        const { idempotency_key, ...intent }=request.postDataJSON();
        assert.match(idempotency_key,/^[0-9a-f-]{36}$/i);
        assert.deepEqual(intent,{version:9});
        cancellations++;
        reservationStatus='cancelled';
        body={data:getReservation(reservationStatus)};
      }
      else if(path==='/reservations/17' || path==='/reservations/17/checkout-context' || path==='/reservations') {
        assert.ok(request.headers().authorization);
        if(path==='/reservations') body={data:reservationStatus?[getReservation(reservationStatus)]:[],
          meta:{...collection.meta,total:reservationStatus?1:0}};
        else body={data:path.endsWith('/checkout-context')?getContext(reservationStatus,readinessState):getReservation(reservationStatus)};
      }
      else if(path==='/inquiries/42/quotes') {
        assert.ok(request.headers().authorization);
        if(request.method()==='POST') {
          const input=request.postDataJSON();
          assert.deepEqual(Object.keys(input),['idempotency_key']);
          assert.match(input.idempotency_key,/^[0-9a-f-]{36}$/i);
          issueKeys.push(input.idempotency_key);
          if(issueKeys.length===1) {
            status=503;body=error('temporarily_unavailable','No se pudo verificar la emisión.');
          } else {
            quoteIssued=true;body={data:getQuote()};
          }
        } else body={data:quoteIssued?[getQuote(quoteAccepted?'accepted':'pending')]:[],
          meta:{...collection.meta,total:quoteIssued?1:0}};
      }
      else if(path===`/quotes/${quoteId}` || path===`/quotes/${quoteId}/accept`) {
        assert.ok(request.headers().authorization);
        if(path.endsWith('/accept')) {
          assert.equal(request.method(),'POST');
          assert.deepEqual(request.postDataJSON(),{acknowledge:true});
          quoteAccepted=true;
          acceptancePosts++;
        }
        body={data:getQuote(quoteAccepted?'accepted':'pending')};
      }
      else if(path==='/inquiries/42' || path==='/inquiries/42/journey') {
        assert.ok(request.headers().authorization);
        if(inquiryReadMode==='missing') {status=404;body=error('not_found','El recurso no está disponible.');}
        else if(inquiryReadMode==='unavailable' && path.endsWith('/journey')) {
          status=503;body=error('temporarily_unavailable','No se puede consultar el seguimiento.');
        } else if (!quotePhase) body={data:path.endsWith('/journey')?journey:inquiry};
        else body={data:path.endsWith('/journey')?
          (reservationStatus?getReservationJourney(reservationStatus,readinessState):getQuoteJourney(quoteIssued?getQuote(quoteAccepted?'accepted':'pending'):null,quoteAccepted)):
          {...inquiry,status:'accepted',accepted_at:inquiry.created_at}};
      }
      else if(mode==='offline') {await route.abort('failed');return;}
      else if(path==='/providers') body={data:mode==='empty'?[]:[provider],meta:{...meta,total:mode==='empty'?0:1}};
      else if(path==='/services' && mode==='malformed') body={data:{...service},meta};
      else if(path==='/services' && mode==='unavailable') {
        await route.fulfill({status:503,contentType:'text/html',body:'<p>Unavailable</p>',
          headers:{'Retry-After':'2','Access-Control-Allow-Origin':'http://127.0.0.1:18080','Access-Control-Expose-Headers':'Retry-After'}});
        return;
      }
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
    for (const path of ['/tabs/cuenta','/tabs/chat','/tabs/reserva','/tabs/pago','/tabs/solicitud?id=42']) {
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
    await signIn('redirect');
    await visible('No se pudo conectar con Tekora. Revisa tu conexión y reintenta.');
    assert.equal(redirectRequests,0);
    results.push('Login rechaza redirección 307 de HTTPS a HTTP sin contactar el destino.');
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
    await visible('Solicita un servicio publicado');
    await page.getByText('Abrir catálogo',{exact:true}).click();
    results.push('Perfil obtiene /providers/7; la acción de solicitar lleva al catálogo sin enviar una petición de escritura.');
    await visible('Soporte de computadoras');
    await page.getByText('Soporte de computadoras',{exact:true}).click();
    await visible('Detalle del servicio');
    await visible('Diagnóstico remoto.');
    assert.ok(requests.some(r=>r.path==='/services/21'));
    await page.getByRole('button',{name:'Consultar horario publicado',exact:true}).click();
    await visible('Zona horaria: America/Mexico_City');
    await visible('Lunes: 09:00–17:00');
    await page.getByRole('button',{name:'Ocultar horario publicado',exact:true}).click();
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
    mode='malformed';
    await page.getByLabel('Actualizar catálogo',{exact:true}).click();
    await visible('Tekora devolvió datos inesperados. Reintenta.');
    mode='unavailable';
    await page.getByText('Reintentar',{exact:true}).click();
    await visible('Tekora no está disponible temporalmente. Inténtalo más tarde.');
    const retryUnavailable=page.getByRole('button',{name:'Reintentar',exact:true});
    assert.equal(await retryUnavailable.isDisabled(),true);
    const totalServiceReads=requests.filter(r=>r.path==='/services' && r.method==='GET').length;
    await page.getByLabel('Actualizar catálogo',{exact:true}).click();
    assert.equal(requests.filter(r=>r.path==='/services' && r.method==='GET').length,totalServiceReads);
    mode='normal';
    await page.getByText('Reintentar',{exact:true}).click();
    await visible('Soporte de computadoras');
    results.push('Catálogo rechaza JSON malformado y 503, bloquea reintento hasta Retry-After y luego recupera la lectura.');

    await page.getByRole('tab',{name:'Historial',exact:true}).click();
    await visible('Todavía no tienes solicitudes.');
    await page.getByRole('tab',{name:'Catálogo público',exact:true}).click();
    await page.getByText('Soporte de computadoras',{exact:true}).click();
    const fillInquiry = message => page.getByLabel('Descripción de la solicitud',{exact:true}).fill(message);
    const sendInquiry = () => page.getByRole('button',{name:'Enviar solicitud',exact:true}).click();
    await sendInquiry();
    await visible('Describe lo que necesitas con entre 10 y 2000 caracteres.');
    assert.equal(inquiryPosts,0);
    await fillInquiry('No se podrá verificar esta solicitud.');
    await sendInquiry();
    await visible('No se pudo comprobar el envío. Revisa tu historial antes de crear otra solicitud.');
    assert.equal(inquiryPosts,1);
    await page.getByRole('button',{name:'Ver historial',exact:true}).click();
    await visible('Todavía no tienes solicitudes.');
    await page.getByRole('tab',{name:'Catálogo público',exact:true}).click();
    await page.getByText('Soporte de computadoras',{exact:true}).click();
    await fillInquiry('El servidor rechaza este texto.');
    await sendInquiry();
    await visible('Revisa la descripción enviada.');
    await fillInquiry(inquiry.message);
    await sendInquiry();
    await visible('Espera la respuesta del prestador');
    await visible('Solicitud #42 · Pendiente');
    for(const step of journey.progress.steps) await visible(step.label);
    await visible('Historial de contratación');
    await visible('Solicitud enviada');
    assert.equal(inquiryPosts,3);
    results.push('Solicitudes: historial vacío, validación local y 422, 503 de escritura sin reenvío y creación 201 con cinco etapas.');
    inquiryReadMode='unavailable';
    await page.getByLabel('Actualizar solicitud',{exact:true}).click();
    await visible('No se puede consultar el seguimiento.');
    inquiryReadMode='normal';
    await page.getByLabel('Actualizar solicitud',{exact:true}).click();
    await visible('Espera la respuesta del prestador');
    inquiryReadMode='missing';
    await page.getByLabel('Actualizar solicitud',{exact:true}).click();
    await visible('La solicitud no está disponible para esta cuenta.');
    assert.equal(await page.getByText(inquiry.message,{exact:true}).count(),0);
    inquiryReadMode='normal';
    await page.getByLabel('Actualizar solicitud',{exact:true}).click();
    await visible('Solicitud #42 · Pendiente');
    await page.getByLabel('Volver',{exact:true}).click();
    await visible('Detalle del servicio');
    await page.getByLabel('Volver',{exact:true}).click();
    await page.getByRole('tab',{name:'Historial',exact:true}).click();
    await page.getByRole('button',{name:'Solicitud #42: Soporte de computadoras, Pendiente'}).click();
    await visible('Espera la respuesta del prestador');
    await page.screenshot({path:join(evidence,'seguimiento-solicitud.png'),fullPage:true});
    await page.getByLabel('Volver',{exact:true}).click();
    await visible('Mis solicitudes');
    results.push('Historial propio reabre el detalle; 503 de lectura admite reintento y 404 oculta los datos privados.');
    quotePhase=true;
    await page.getByRole('button',{name:/Solicitud #42: Soporte de computadoras/}).click();
    await page.getByRole('button',{name:'Solicitar cotización',exact:true}).click();
    await visible('No se pudo comprobar el resultado. Actualiza las cotizaciones antes de repetir la acción.');
    assert.equal(issueKeys.length,1);
    await page.getByRole('button',{name:'Reintentar la misma emisión',exact:true}).click();
    await visible('Detalle de la cotización');
    assert.equal(issueKeys.length,2);
    assert.equal(issueKeys[0],issueKeys[1]);
    assert.equal(acceptancePosts,0);
    await page.getByRole('button',{name:'Revisar aceptación',exact:true}).click();
    assert.equal(acceptancePosts,0);
    await page.getByRole('button',{name:'Volver sin aceptar',exact:true}).click();
    assert.equal(acceptancePosts,0);
    await page.getByRole('button',{name:'Revisar aceptación',exact:true}).click();
    await page.getByRole('button',{name:'Confirmar aceptación',exact:true}).click();
    await visible('Cotización aceptada.');
    await visible('Importe acordado');
    await visible('Comisión Tekora 15 % incluida: MXN 150.00');
    assert.equal(acceptancePosts,1);
    assert.equal(await page.getByRole('button',{name:'Solicitar cotización',exact:true}).count(),0);
    results.push('Cotización mantiene UUID tras 503, exige consentimiento y presenta el total y la comisión del servidor.');


    await page.getByRole('button',{name:'Proponer horario',exact:true}).click();
    await visible('Zona horaria: America/Mexico_City');
    await page.getByLabel('Fecha de la propuesta',{exact:true}).fill('2026-11-23');
    await page.getByLabel('Hora de la propuesta',{exact:true}).fill('10:00');
    await page.getByRole('radio',{name:/1,000.00/}).click();
    await page.getByRole('button',{name:'Enviar propuesta',exact:true}).click();
    await visible('No se pudo verificar la propuesta.');
    assert.equal(proposals,1);
    await page.getByRole('button',{name:'Reintentar la misma propuesta',exact:true}).click();
    await visible('Espera de aceptación');
    assert.equal(proposals,2);
    assert.equal(proposalKeys[0],proposalKeys[1]);
    reservationStatus='held';
    await page.getByRole('button',{name:'Actualizar reserva',exact:true}).click();
    await visible('Retención activa');
    await visible('Versión de reserva: 8');
    await visible('El plazo original es de 900 segundos. Volver a consultar no lo amplía.');
    await visible('Esta reserva requiere un paso fuera de la app.');
    assert.equal(await page.getByRole('button',{name:'Revisar confirmación',exact:true}).count(),0);
    assert.equal(commitKeys.length,0);
    readinessState='ready';
    await page.getByRole('button',{name:'Actualizar reserva',exact:true}).click();
    await page.getByRole('button',{name:'Revisar confirmación',exact:true}).click();
    assert.equal(commitKeys.length,0);
    await page.getByRole('button',{name:'Confirmar contratación',exact:true}).click();
    await visible('No se pudo comprobar la operación. Consulta el estado antes de repetirla.');
    assert.equal(commitKeys.length,1);
    await page.getByRole('button',{name:'Revisar confirmación',exact:true}).click();
    await page.getByRole('button',{name:'Confirmar contratación',exact:true}).click();
    await visible('Contratación confirmada por Tekora.');
    await visible('Reserva confirmada');
    assert.equal(commitKeys.length,2);
    assert.equal(commitKeys[0],commitKeys[1]);
    results.push('B2 bloquea el requisito web, confirma explícitamente con ambas lecturas y conserva UUID tras 503.');

    await page.getByRole('button',{name:'Cancelar reserva',exact:true}).click();
    assert.equal(cancellations,0);
    await page.getByRole('button',{name:'Confirmar cancelación',exact:true}).click();
    await visible('Reserva cancelada');
    assert.equal(cancellations,1);
    await page.getByLabel('Volver',{exact:true}).click();
    await page.getByLabel('Volver',{exact:true}).click();
    await visible('Mis solicitudes');
    results.push('Horario publicado, propuesta con UUID estable tras 503, retención y cancelación con la versión de reserva.');

    await page.getByText('Mensajes',{exact:true}).click();
    await visible('Actualizar conversaciones');
    assert.equal(messagesRead,false);
    await page.getByRole('button',{name:/Soporte de computadoras.*Solicitud #42/}).click();
    await visible('Mensaje recibido de prueba.');
    await page.getByRole('button',{name:'Mensajes anteriores',exact:true}).click();
    await visible('Mensaje anterior de prueba.');
    await page.getByRole('button',{name:'Mensajes más recientes',exact:true}).click();
    await visible('Mensaje recibido de prueba.');
    assert.equal(messagesRead,false);
    await page.getByRole('button',{name:'Marcar página como leída',exact:true}).click();
    await page.getByRole('button',{name:'Marcar página como leída',exact:true}).waitFor({state:'hidden'});
    assert.equal(messagesRead,true);
    await page.getByLabel('Mensaje',{exact:true}).fill(ownMessage.body);
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
    await visible('No se pudo verificar el envío.');
    assert.equal(messageKeys.length,1);
    await page.getByRole('button',{name:'Reintentar el mismo mensaje',exact:true}).click();
    await visible(ownMessage.body);
    assert.equal(messageKeys[0],messageKeys[1]);
    await page.getByLabel('Volver a conversaciones',{exact:true}).click();
    await visible('Actualizar conversaciones');
    await page.getByRole('button',{name:'Mis reservas',exact:true}).click();
    await visible('Historial de reservas');
    await visible('Reserva cancelada');
    assert.equal(await page.getByText('Ver vista previa de pagos',{exact:true}).count(),0);
    await page.getByLabel('Volver',{exact:true}).click();
    await visible('Actualizar conversaciones');
    results.push('Conversación usa cursor y marcado explícito, y repite un mensaje con el mismo UUID tras 503.');
    await page.getByText('Inicio',{exact:true}).click();
    await page.getByRole('button',{name:'Notificaciones',exact:true}).click();
    await visible('Notificaciones sin leer: 1');
    await visible(notification.label);
    assert.equal(noticeRead,false);
    await page.getByRole('button',{name:'Marcar aviso como leído',exact:true}).click();
    await visible('Notificaciones sin leer: 0');
    await page.getByRole('button',{name:'Ver detalle del aviso',exact:true}).click();
    await visible('Solicitud #42 · Aceptada');
    await page.getByLabel('Volver',{exact:true}).click();
    await visible('Notificaciones sin leer: 0');
    await page.getByLabel('Volver',{exact:true}).click();
    await page.getByText('Mi cuenta',{exact:true}).click();
    results.push('Notificaciones: contador real, marcado por identificador compuesto y navegación al recurso propio.');
    await visible('cliente@example.test');
    await page.screenshot({path:join(evidence,'cuenta.png'),fullPage:true});
    await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
    await visible('Te damos la bienvenida a Tekora');
    assert.equal(logouts,1);
    assert.ok(requests.filter(r=>r.path==='/auth/logout').every(r=>r.hasBearer));
    results.push('Cuenta usa identidad real; logout envía POST Bearer.');
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
    await page.setViewportSize({width:320,height:720});
    await signIn('válida-sintética');
    await visible('Expertos publicados');
    await page.getByRole('button',{name:'Mis solicitudes',exact:true}).click();
    await visible('Mis solicitudes');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:/Solicitud #42:/}).click();
    await visible('Seguimiento');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:join(evidence,'seguimiento-320.png'),fullPage:true});
    results.push('Inicio enlaza al historial, con navegación accesible y sin desbordamiento horizontal a 320 px.');

    assert.ok(requests.filter(r=>r.method==='GET'&&(r.path.startsWith('/services')||r.path.startsWith('/providers'))).every(r=>!r.hasBearer));
    assert.deepEqual(errors,[]);
    writeFileSync(join(evidence,'results.json'),JSON.stringify({results,requests,consolePageErrors:errors},null,2));
    console.log(JSON.stringify({passed:results.length,results,consolePageErrors:errors},null,2));
  } catch(error) {
    if(page) {await page.screenshot({path:join(evidence,'failure.png'),fullPage:true});console.log(JSON.stringify({requests,errors,body:await page.locator('body').innerText()},null,2));}
    throw error;
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
