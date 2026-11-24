// @ts-check
import { test, request, chromium, devices } from '@playwright/test';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
const { JSDOM } = require("jsdom");
const { Transform } = require('stream');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const AdmZip = require('adm-zip');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const zlib = require('zlib');

//constantes
let pag = undefined;
let basePath = "";
let currentPath = "";
let screenshotPromise = Promise.resolve();
const el0 = "mylhordes";
//myhordes0
const el1 = "f6e1a8350911";
const actions = {
	"/jx/ghost/welcome": joinToTown,
	"/jx/town/dashboard": playInTown,
	"/jx/beyond/desert/cached": playInDeserted,
	"/jx/game/jobcenter": selectJob,
	"/jx/soul/welcomeToNowhere": acceptDead
};
const actionsPlayTown = {
	1: startPlayTown,
	2: betweenSafeDays,
	3: betweenSafeDays,
	4: betweenSafeDays,
	5: betweenSafeDays,
	6: betweenSafeDays,
	7: betweenSafeDays,
}
let idPlayerInv = undefined;
const constFile = path.join(".", "tests", "constants");
const lastWordsFile = path.join(constFile, "lastWords.json");
let lastWords = {};
const baseFiles = path.join(".", "tests", "bitacora");
const nameFile_lastDataSaved = path.join(baseFiles, ".last.json");
let lastDataSaved = {};
let dataSaved = {};
let nameFile_dataSaved = baseFiles;
let gestHorderData = {};
let externalTools = false;
let countMainInvocation = 0;
let uniqueProfile;
let weaponListData = {};
let items = {};
let browsergest;
let deferGitPush = false;
const pendingGitPaths = new Set();
let gitNeedsFullStage = false;
let gitConfigured = false;
const writtenJsonCache = new Map();
let cachedGestHordes = null;
let cachedWeapons = null;
let testStartTime = 0;
let screenshotInFlight = false;
let queuedScreenshotFile = null;
const botToken = "8571353822:AAH1avvfeURxxlx0ow2E5dpBorv0aq9mqrk"
const chatId  = "1975024455"
test('resetLogs', async ({ page }) => {
    test.setTimeout(60 * 60 * 1000); // 5 minutos solo para este test
	// Navegar para que el navegador obtenga la cookie de Cloudflare
	
	//await page.goto('https://gesthordes.fr/rest/v1/prototype/all');

	lastDataSaved = readJSON(nameFile_lastDataSaved);
	nameFile_dataSaved = path.join(baseFiles, lastDataSaved.idTown + ".json");
	if(Object.keys(dataSaved).length === 0){
		dataSaved = readJSON(nameFile_dataSaved);
	}
	dataSaved.log = {}
	//await sendTelegramMessage("Mensaje Enviado");

	//await createRoutes(18);
	//await getRoute(18);
	await createRoutes(20);
	//await getRoute(20);
	//createRoutes(22);
	//await getRoute(22);
	writeJSON(nameFile_dataSaved, dataSaved);
	//await getRoute(2);
	
});
test('UpdateWeaponData', async ({ page }) => {
	// Navegar para que el navegador obtenga la cookie de Cloudflare
	await page.goto('https://gesthordes.fr/rest/v1/prototype/all');
	
	// Intentar obtener el JSON desde dentro del navegador
	let data;
	try {
		data = await page.evaluate(async () => {
			const res = await fetch('https://gesthordes.fr/rest/v1/prototype/all', {
			headers: { "accept": "application/json" }
		});
		if (!res.ok) {
			throw new Error(`Respuesta no OK: ${res.status}`);
		}
		return res.json();
		});
	} catch (err) {
		//log('❌ No se pudo obtener JSON válido:', err.message);
		return; // salir sin hacer commit
	}

	writeJSON('./data/weapons.json', data);
});
test('GetGestHordes', async ({page}) => {
	
	lastDataSaved = readJSON(nameFile_lastDataSaved);
	const idTown = lastDataSaved.idTown;
	await page.goto('https://gesthordes.fr/news', { waitUntil: 'networkidle' });	
	const cookies = await page.context().cookies();
	//log(cookies);
	const response = await page.evaluate(async (idTown) => {
		const res = await fetch(`https://gesthordes.fr/rest/v1/carte/${idTown}`, {
			headers: {
				"accept": "application/json",
				"gh-mapid": parseInt(idTown, 10)
			}
		});
		/*
		const contentType = res.headers.get("content-type");
		let result;
		if (contentType && contentType.includes("application/json")) {
			try{
				result = await res.json();
			}catch(err){
				result = await res.text();
			}
		} else {
			result = await res.text();
		}
		return result;
		*/
		return res.json();
	}, idTown);
	//log(response);
	await page.goto(`https://gesthordes.fr/carte/${idTown}`);
	//log(response);
	//parseJsonObject(response);
	writeJSON('data/gestHordes.json', response);
});

test('myhordes', async () => { 
	test.setTimeout(250000);
	testStartTime = Date.now();
	deferGitPush = true;
	countMainInvocation = 0;
	externalTools = false;
	let gestHordesPromise;
	const baseDir = process.env.LOCALAPPDATA || process.env.HOME;
	uniqueProfile = path.join(baseDir, 'playwright-profiles', randomUUID());
	let browserPlay;
	let browserLogin;
	try {
		try {
			if (Object.keys(lastDataSaved).length === 0 && fs.existsSync(nameFile_lastDataSaved)) {
				lastDataSaved = readJSON(nameFile_lastDataSaved);
				if (lastDataSaved?.inv?.IdInvPer) {
					idPlayerInv = lastDataSaved.inv.IdInvPer;
				}
			}
		} catch (e) {
			console.error("Error leyendo .last.json inicial:", e.message || e);
		}

		const pathToExtension = await resolveExtensionPath();
		const { defaultBrowserType: _unusedBrowserType, ...desktopEdgeDevice } =
			devices['Desktop Edge'];
		
		const desktopEdge = {
			...desktopEdgeDevice,
			channel: 'msedge',
			headless: true,
			locale: 'es-ES'
		};

		// 1. Iniciar sesión primero en contexto limpio (sin extensión ni contención de CPU) para persistir cookies de EternalTwin/MyHordes
		browserLogin = await chromium.launchPersistentContext(
			uniqueProfile,
			desktopEdge
		);
		pag = await browserLogin.newPage();
		if (!(await login())) {
			throw new Error("No se logró iniciar sesión");
		}
		await new Promise(r => setTimeout(r, 1000));
		await browserLogin.close();
		browserLogin = undefined;

		// 2. Lanzar browserPlay con la extensión MHO y actualizar GestHordes en paralelo
		if (Object.keys(weaponListData).length === 0) {
			weaponListData = readJSON('data/weaponListData.json');
		}
		if (Object.keys(items).length === 0) {
			items = readJSON('data/items.json');
		}
		if (lastDataSaved?.idTown) {
			gestHordesPromise = updateGestHordesPromise().catch(exception => {
				console.error("No se logró abrir/actualizar GestHordes:", exception.message || exception);
			});
		}

		browserPlay = await chromium.launchPersistentContext(uniqueProfile, {
			...desktopEdge,
			args: pathToExtension ? [
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`
			] : []
		});
		pag = await browserPlay.newPage();
		await goto('/jx/town/dashboard');
		await waitForGameReady();

		if (gestHordesPromise !== undefined) {
			await gestHordesPromise;
			gestHordesPromise = undefined;
		}
		
		// inicia ejecución
		await main();
	} catch(exception){
		console.log(exception);
		await sendTelegramMessage(String(exception?.message || exception));
	} finally {
		await screenshotPromise;
		if(gestHordesPromise != undefined){
			await gestHordesPromise.catch(() => {});
		}
		if(browserPlay){
			await browserPlay.close().catch(() => {});
		}
		if(browserLogin){
			await browserLogin.close().catch(() => {});
		}
		if(browsergest){
			await browsergest.close().catch(() => {});
		}
		try {
			flushGitChanges();
		} finally {
			deferGitPush = false;
		}
	}
});

async function dismissPromptIfVisible() {
	try {
		const noInteresado = pag.getByText('No interesado');
		if (await noInteresado.isVisible().catch(() => false)) {
			await noInteresado.click({ timeout: 1500 });
			await pag.keyboard.press('Enter');
		}
	} catch (exception) {}
}

async function waitForGameReady(timeout = 6000) {
	await pag.waitForFunction(() => {
		const lz = document.querySelector('#loadzone');
		if (lz && lz.hasAttribute('x-stack') && lz.getAttribute('x-stack') !== '0') {
			return false;
		}
		const p = window.location.pathname;
		const content = document.querySelector('#content');
		if (p === '/jx/beyond/desert/cached') {
			return Boolean(
				document.querySelector('#header-rucksack-items') &&
				(document.querySelector('.current-location') || document.querySelector('.zombies-cp'))
			);
		}
		if (p === '/jx/town/dashboard') {
			return Boolean(
				document.querySelector('#header-rucksack-items') &&
				document.querySelector('span.day-number') &&
				content && content.children.length > 0
			);
		}
		if (p === '/jx/game/jobcenter') {
			return Boolean(document.querySelector('hordes-town-onboarding'));
		}
		if (p === '/jx/soul/welcomeToNowhere') {
			return Boolean(document.querySelector('button[x-ajax-href="/jx/game/raventimes"], #rebirth_btn'));
		}
		if (p === '/jx/ghost/welcome') {
			return Boolean(content && content.children.length > 0);
		}
		return false;
	}, { timeout }).catch(() => {});
}

async function main(targetPath = '/jx/town/dashboard'){
	if (testStartTime && (Date.now() - testStartTime > 215000)) {
		console.log("Tiempo preventivo alcanzado, guardando progreso antes del timeout...");
		return;
	}
	countMainInvocation++;
	// prevee bucles
	if(countMainInvocation > 24){
		throw new Error("Se prevee posible bucle");
	}

	let currentPathname = "";
	try {
		currentPathname = new URL(pag.url()).pathname;
	} catch (e) {}

	if (countMainInvocation > 1 || !actions[currentPathname]) {
		console.error(`Dirigiendo a ${targetPath}: ` + pag.url());
		await goto(targetPath);
	}
	await waitForGameReady();
	console.error("Vista lista: " + pag.url());

	// se recuperan constantes del juego e historico del pueblo
	try{
		if(Object.keys(lastDataSaved).length === 0){
			lastDataSaved = readJSON(nameFile_lastDataSaved);
			if (lastDataSaved?.inv?.IdInvPer) {
				idPlayerInv = lastDataSaved.inv.IdInvPer;
			}
		}
		nameFile_dataSaved = path.join(baseFiles, lastDataSaved.idTown + ".json");
		if(Object.keys(dataSaved).length === 0){
			try{
				dataSaved = readJSON(nameFile_dataSaved);
			}catch(ex){
				dataSaved = {};
				lastDataSaved.inv = undefined;
				writeJSON(nameFile_dataSaved, dataSaved);
			}
		}
	}catch(exception){
		writeJSON(nameFile_lastDataSaved, lastDataSaved);
		if(Object.keys(dataSaved).length === 0){
			writeJSON(nameFile_dataSaved, {});
		}
	}finally{
		if(Object.keys(dataSaved).length != 0){
			writeJSON(nameFile_dataSaved, dataSaved);
		}
		if(Object.keys(lastDataSaved).length != 0){
			writeJSON(nameFile_lastDataSaved, lastDataSaved);
		}
	}
	// se determinan acciones a realizar según la situación actual del jugador
	try{
		gestHorderData = await getGestHordes();
		if(gestHorderData?.data?.general?.ville?.map_id != lastDataSaved?.idTown) {
			return;
		}
		await evaluateWebSite();
	}catch(exception){
		console.log(exception);
	}finally{
		writeJSON(nameFile_dataSaved, dataSaved);
	}
}

// segun el path del sitio actual realiza las asignaciones correspondientes
async function evaluateWebSite(){
	await dismissPromptIfVisible();
	currentPath = new URL(pag.url()).pathname;
	if (actions[currentPath]) {
		await actions[currentPath]();
	} else {
		await pag.waitForLoadState('domcontentloaded');
		await waitForGameReady(4000);
		currentPath = new URL(pag.url()).pathname;
		if (actions[currentPath]) {
			await actions[currentPath]();
		} else {
			await goto('/jx/town/dashboard');
			await waitForGameReady(5000);
			currentPath = new URL(pag.url()).pathname;
			if (actions[currentPath]) {
				await actions[currentPath]();
			}
		}
	}
}

// flujo principal cuando el jugador esta en la ciudad
async function playInTown(){
	await pag.waitForSelector('#header-rucksack-items');
	// se busca el día actual y se ejecuta el proceso correspondiente
	let currentDay = parseInt((await pag.locator('span.day-number').innerText()).replace(/\D/g, ''), 10);
	if (actionsPlayTown[currentDay]) {
		await actionsPlayTown[currentDay](currentDay);
	} else {
		await defaultPlayTown(currentDay);
	}
}

async function runTownDaySteps(currentDay, persistEachStep = false){
	await goto("/jx/town/house/dash");
	await pag.waitForSelector('#header-rucksack-items');
	
	let inv = await getInventoryIds();
	if(dataSaved[`day${currentDay}`] === undefined){
		dataSaved[`day${currentDay}`] = {};
		dataSaved[`day${currentDay}`].currentStep = 0;
		dataSaved[`day${currentDay}`].purge = false;
		if (currentDay === 1) {
			dataSaved.hasUsedDrugs = false;
			
			dataSaved.heroicAction = {};
			dataSaved.heroicAction.hallazgo = true;
			dataSaved.heroicAction.retorno = true;
			dataSaved.heroicAction.golpe = true;
			dataSaved.heroicAction.pa = true;
			
			let weaponsGestHordes = await getWeaponsGestHordes();
			if(weaponsGestHordes != undefined){
				const weapons = Object.entries(weaponsGestHordes.data.items)
				.filter(([id, obj]) => obj.kill_min !== undefined && obj.kill_min !== null)
				.map(([id, obj]) => ({ id, ...obj }));
				weaponListData.weaponList = weapons.filter(obj => obj.encombrant === false);
				weaponListData.weaponHeavyList = weapons.filter(obj => obj.encombrant === true);
				writeJSON('data/weaponListData.json', weaponListData);
			}
		}
	}

	let cachedStoInv = undefined;
	let apPotentiallyChanged = false;
	
	const steps = [
		async () => { // vaciar inventario
			for (let item in await getBaulInventory(inv)) {
				await moveItem(inv.IdInvBau, inv.IdInvPer, item);
			}
			const dropRes = await dropPlayerInventory(inv);
			if (dropRes?.target) {
				cachedStoInv = await getListItems(dropRes.target);
			}
			return true;
		},
		async () => { // intentar usar dados y cartas si existen
			cachedStoInv ??= await getStorageInventory(inv);
			const resDice = await UseAndReturn(inv, cachedStoInv, 32, "133");
			if (resDice?.used) {
				apPotentiallyChanged = true;
				cachedStoInv = resDice.storageInventory;
			}
			cachedStoInv ??= await getStorageInventory(inv);
			const resCards = await UseAndReturn(inv, cachedStoInv, 130, "134");
			if (resCards?.used) {
				apPotentiallyChanged = true;
				cachedStoInv = resCards.storageInventory;
			}
			return true;
		},
		async () => { // preparar objetos para la ruta
			cachedStoInv ??= await getStorageInventory(inv);
			dataSaved[`day${currentDay}`].startItems = await prepareToExplore(inv, cachedStoInv);
			cachedStoInv = undefined;
			return true;
		},
		async () => { // abrir puerta si es necesario y refrescar PAs
			const elemento = (await doAction('/jx/town/door', 'GET', {})).includes('door_exit_hero');
			if (!elemento) {
				await doAction("/rest/v1/game/town/core/door", "PATCH", {action: "open"});
				apPotentiallyChanged = true;
			}
			if (apPotentiallyChanged || new URL(pag.url()).pathname !== "/jx/town/house/dash") {
				await goto("/jx/town/house/dash");
				await pag.waitForSelector('#header-rucksack-items');
			}
			return true;
		},
		async () => { // preparar ruta
			const foodToExplore = items.foods.find(food => food.id === dataSaved[`day${currentDay}`].startItems.idFood);
			const waterToExplore = items.waters.find(water => water.id === dataSaved[`day${currentDay}`].startItems.idWater);
			const currentPAs = await pag.locator('b[data-incidental-target="ap"]').getAttribute('data-value');
			dataSaved[`day${currentDay}`].route = await getRoute((foodToExplore?.pa ?? 0) + (waterToExplore?.pa ?? 0) + parseInt(currentPAs, 10), dataSaved.hasUsedDrugs ? 2 : 3);
			return true;
		},
		async () => { // salir al desierto -> avance en el desierto (función playInDeserted)
			// si logró crear ruta proceder a ir al desierto, sinó ejecutar defaultPlayTown
			if(dataSaved[`day${currentDay}`].route != undefined && dataSaved[`day${currentDay}`].route.way != undefined && dataSaved[`day${currentDay}`].route.way.length != 0 
			   && dataSaved[`day${currentDay}`].route.currentPoss < dataSaved[`day${currentDay}`].route.way.length - 1){
				dataSaved[`day${currentDay}`].referenceStep = dataSaved[`day${currentDay}`].currentStep;
				// Explora el Horizonte, Crea Expedición y consulta puerta en paralelo
				const prepTasks = [
					doAction("/api/town/planner/submit", "POST", {"data": dataSaved[`day${currentDay}`].route.way.map(({ x, y }) => [x, y]), "name": `[Mí Ruta Día ${currentDay}] :S`}),
					doAction('/jx/town/door', 'GET', {})
				];
				if (Math.random() < 0.8) {
					prepTasks.push(doAction("/api/town/watchtower/est", "POST", {}));
				}
				const [, doorHtml] = await Promise.all(prepTasks);
				// salir del pueblo
				const elemento = doorHtml.includes('door_exit_hero');
				if (elemento) {
					dataSaved[`day${currentDay}`].heroExit = true;
					await doAction("/rest/v1/game/town/core/door/exit/hero", "POST", {});
				}else{
					await doAction("/rest/v1/game/town/core/door/exit", "POST", {});
				}
				// ir directamente al desierto sin doble navegación
				await main("/jx/beyond/desert/cached");
			}else{
				// TODO: si no logró crear una ruta, entonces ejecutar jugar en ciudad
			}
			return false;
		},
		async () => { // jugar en la ciudad
			let currentPAs = parseInt(await pag.locator('b[data-incidental-target="ap"]').getAttribute('data-value'), 10);
			// intenta mejorar su casa:
			// TODO: Añadir capacidad de construir mas allá del nivel 1
			if(currentPAs > 2){
				await doAction("/api/town/house/upgrade", "POST", {});
			}
			// valida si tiene PA's, si tiene intenta aportar en contruccion
			await goBuild(currentPAs - 1);
			// valida que la puerta este
			console.log("Inicia paso de validación de puerta");
			const attackTime = (await pag.locator('.attack-time').textContent())?.trim() || '';
			if (/^~0:[0-2]\d$/.test(attackTime)) {
				const elemento = await doAction('/jx/town/door', 'GET', {});
				if (elemento) {
					if (elemento.includes("Portal abierto")) {
						// cerrar portal
						if ((await closePortal())?.error) {
							// faltan 5 min o menos y no tiene PA, tomar lo que sea para cerrarlo
							if (/^~0:[0-2][0-9]$/.test(attackTime)) {
								const inv = await getInventoryIds();
								let stoInv = await getStorageInventory(inv);
								// usar objetos varios diarios
								const r1 = await UseAndReturn(inv, stoInv, 32, '133');
								if (r1?.storageInventory) stoInv = r1.storageInventory;
								await UseAndReturn(inv, stoInv, 130, '134');
								// volver a intentar cerrar portal
								await closePortal();
							}
						}
					}else{
						await goBuild(parseInt(await pag.locator('b[data-incidental-target="ap"]').getAttribute('data-value'), 10));
					}
				}
			}
			return false;
		}
	];
	try{
		for (; dataSaved[`day${currentDay}`].currentStep < steps.length; dataSaved[`day${currentDay}`].currentStep++) {
			if (persistEachStep) {
				writeJSON(nameFile_dataSaved, dataSaved);
			}
			if(!(await steps[dataSaved[`day${currentDay}`].currentStep]())){
				break;
			}
		}
	}catch(exception){
		console.log(exception);
	}finally{
		if (persistEachStep) {
			writeJSON(nameFile_dataSaved, dataSaved);
		}
	}
}

async function startPlayTown(currentDay){
	return await runTownDaySteps(currentDay, true);
}

async function betweenSafeDays(currentDay){
	return await runTownDaySteps(currentDay, false);
}

async function defaultPlayTown(currentDay){
	
}


// flujo principal cuando el jugador esta en el desierto
async function playInDeserted(){
	console.log("Inicia playInDeserted()");
	await pag.waitForSelector('#header-rucksack-items');
	await updateGestHordes();
	try{
		// se busca el día actual y se ejecuta el proceso correspondiente
		let currentDay = parseInt((await pag.locator('span.day-number').innerText()).replace(/\D/g, ''), 10);
		console.log(currentDay);
		if(dataSaved[`day${currentDay}`]?.camping){
			return;
		}
		const currentSaved = dataSaved[`day${currentDay}`];
		await tryFixCurrentCoordinates(currentSaved);
		const currentPoss = currentSaved.route.way[currentSaved.route.currentPoss];
		
		if(currentSaved.route.currentPoss == 0 && currentPoss.x == 0 && currentPoss.y == 0){
			// ir a la siguiente posición
			const nextPoss = currentSaved.route.way[currentSaved.route.currentPoss + 1];
			if((await doAction("/api/beyond/desert/move", "POST", { x: nextPoss.x, y: nextPoss.y })).error){
				const currentPAs = await pag.locator('b[data-incidental-target="ap"]').getAttribute('data-value');
				if(currentPAs == 0){ // consumir
					let inv = await getInventoryIds();
					console.log("No tiene PAs, intenta consumir");
					await takeSurvivalFood(currentSaved, inv);
					let canUseItem = false;
					const actionsHtml = await doAction("/jx/beyond/partial/desert/actions", "POST", {});
					const foodAction = currentSaved?.startItems?.idInvFood !== undefined
						? getActionIdFromHtml(actionsHtml, currentSaved.startItems.idInvFood)
						: null;
					//comer
					if(foodAction == null || (await doAction("/api/beyond/desert/action", "POST", {item: currentSaved.startItems.idInvFood, action: foodAction})).error){
						//tomar agua
						const waterAction = currentSaved?.startItems?.idInvWater !== undefined
							? getActionIdFromHtml(actionsHtml, currentSaved.startItems.idInvWater)
							: null;
						if(waterAction == null || (await doAction("/api/beyond/desert/action", "POST", {item: currentSaved.startItems.idInvWater, action: waterAction})).error){
							// TODO: acción si no logré comer ni tomar agua
						}else{
							currentSaved.startItems.idInvWater = undefined;
							canUseItem = true;
						}
					}else{
						currentSaved.startItems.idInvFood = undefined;
						canUseItem = true;
					}
					if(canUseItem){
						writeJSON(nameFile_dataSaved, dataSaved);
						return await main('/jx/beyond/desert/cached');
					}
				}
			}else{
				currentSaved.route.currentPoss = currentSaved.route.currentPoss + 1;
				return await main('/jx/beyond/desert/cached');
			}
		}
		let tempCurrentPoss = {currentPoss};
    	const currentCoodinates = await getCurrentCoodinates();
		if(currentCoodinates != undefined){
			tempCurrentPoss = currentCoodinates;
		}
		// 5. Si se encuentra al final de la ruta en [0,0] entrar al pueblo, TODO: sino intentar acampar
		if(currentSaved.route.currentPoss != 0 && tempCurrentPoss.x == 0 && tempCurrentPoss.y == 0){
			const currentDate = getFormattedDate();
			if(dataSaved.test == undefined){
				dataSaved.test = {};
			}
			dataSaved.test[currentDate] = {};
			
			// salir del desierto
			let goTown = await doAction("/api/beyond/desert/exit", "POST", {});
			if(goTown.error){
				await doAction("/api/beyond/desert/exit/hero", "POST", {});
			}
			try{
				await goto('/jx/town/bank');
				await pag.waitForSelector('#header-rucksack-items', {timeout: 5000});
			}catch(err){
				console.log(`Error: ${err}`);
			}
			let inv = await getInventoryIds();
			const dropRes = await dropPlayerInventory(inv);
			let playInv = dropRes?.source ? await getListItems(dropRes.source) : await getPlayerInventory(inv);
			let outfit = searchItemIdInv([316], playInv);
			dataSaved.test[currentDate].outfit = outfit;
			
			if (outfit != undefined) {
				let doActionObj = await doAction("/jx/town/house/dash", "POST", {});
				let getActionIdFromHtmlObj = getActionIdFromHtml(doActionObj, outfit);
				dataSaved.test[currentDate].getActionIdFromHtmlObj = getActionIdFromHtmlObj;
				if(getActionIdFromHtmlObj != undefined && getActionIdFromHtmlObj != null){
					dataSaved[`day${currentDay}`].currentStep = dataSaved[`day${currentDay}`].referenceStep + 1;
					await doAction("/api/town/house/action", "POST", {item: outfit, action: getActionIdFromHtmlObj});
				}
			}
		}else{
			// 1. Evaluar si la zona esta controlada por los zombies
			const contZ = parseInt(await pag.textContent('.zombies-cp'), 10);
			const contH = parseInt(await pag.textContent('.humans-cp'), 10);
			let purge = (currentSaved.purge != undefined && currentSaved.purge);
			if(contZ > contH || ( contZ > 0 && (purge && currentPoss.purged == undefined))){
				console.log(`Z:${contZ}, H:${contH}`);
				const attackTime = await pag.locator('div.attack-time').innerText();
				let canUseWeapon = false;
				let canUseWeaponBattery = false;
				let canUseHeroicAction = false;
				let returnedToTown = false;
				// atacar
				const contObjetive = (currentSaved.purge != undefined && currentSaved.purge) ? 0 : contH;
				
				let inv = await getInventoryIds();
				let dropRes = await dropPlayerInventory(inv);
				let playInv = dropRes?.source ? await getListItems(dropRes.source) : await getPlayerInventory(inv);
				let deseInv = dropRes?.target ? await getListItems(dropRes.target) : await getDesertInventory(inv);
				if(currentSaved.startItems.idInvFood != undefined){
					const mRes = await moveItem(inv.IdInvDes, inv.IdInvPer, currentSaved.startItems.idInvFood);
					if (mRes?.target) playInv = await getListItems(mRes.target);
					if (mRes?.source) deseInv = await getListItems(mRes.source);
				}
				if(currentSaved.startItems.idInvWater != undefined){
					const mRes = await moveItem(inv.IdInvDes, inv.IdInvPer, currentSaved.startItems.idInvWater);
					if (mRes?.target) playInv = await getListItems(mRes.target);
					if (mRes?.source) deseInv = await getListItems(mRes.source);
				}
				const combination = findClosestWeaponsCombination([...weaponListData.weaponList, ...weaponListData.weaponHeavyList].filter(o => o.id !== 12), contZ - contObjetive, {...playInv, ...deseInv});
				console.error(`combination: ${combination}`);
				if(combination != null){
					for (let i = 0; i < combination.combo.length && !canUseWeapon; i++) {
					    const useObj = combination.combo[i];
					    console.error(`Probando objeto ${i + 1}/${combination.combo.length}`);
					    console.error(`useObj:\n${JSON.stringify(useObj, null, 2)}`);
					    await moveItem(inv.IdInvDes, inv.IdInvPer, useObj.key);
					    let actionToDo = getActionIdFromHtml(
					        await doAction("/jx/beyond/partial/desert/actions", "POST", {}),
					        useObj.key
					    );
					    if (actionToDo != null) {
							if((await doAction(
					            "/api/beyond/desert/action",
					            "POST",
					            {
					                item: useObj.key,
					                action: actionToDo
					            }
					        )).error){
						    	await moveItem(inv.IdInvPer, inv.IdInvDes, useObj.key);
						        console.error(
						            `No se puede usar ${useObj.key}. Probando siguiente combinación...`
						        );
							}else{
					        	canUseWeapon = true;
							}
					        console.error(
					            `Arma válida encontrada en la posición ${i}: ${useObj.key}`
					        );
					    } else {
					    	await moveItem(inv.IdInvPer, inv.IdInvDes, useObj.key);
					        console.error(
					            `No se puede usar ${useObj.key}. Probando siguiente combinación...`
					        );
					    }
					}
				}else{
					let battery = searchItemIdInv([2], deseInv);
					if(battery != undefined){
						let weaponBattery = searchItemIdInv(
						[
							291,   	//Puntero láser potente descargado
							102,   	//Devastador (vacío)
							186,   	//Lanza-pilas Mark II (vacío)
							98,   	//Lanzapilas 1-PDTG (vacío)
							99,   	//Táser de autodefensa (apagado)
							96   	//Batidora eléctrica (apagada)
						], deseInv);
						if(weaponBattery != undefined){
							await moveItem(inv.IdInvDes, inv.IdInvPer, battery);
							await moveItem(inv.IdInvDes, inv.IdInvPer, weaponBattery);
							const reloadAct = getActionIdFromHtml(await doAction("/jx/beyond/partial/desert/actions", "POST", {}), weaponBattery);
							if (reloadAct != null) {
								await doAction("/api/beyond/desert/action", "POST", {item: weaponBattery, action: reloadAct});
							}
							const fireAct = getActionIdFromHtml(await doAction("/jx/beyond/partial/desert/actions", "POST", {}), weaponBattery);
							if (fireAct != null) {
								await doAction("/api/beyond/desert/action", "POST", {item: weaponBattery, action: fireAct});
							}
							canUseWeaponBattery = true;
						}
					}
					if(!canUseWeaponBattery && (!purge || /^~[0123]:/.test(attackTime))){
						if(currentSaved.usedHeroicAction == undefined && dataSaved.heroicAction.golpe){
							if((await doAction("/api/beyond/desert/heroic", "POST", {action: "3"})).error){}else{
								currentSaved.usedHeroicAction = true;
								canUseHeroicAction = true;
							}
							dataSaved.heroicAction.golpe = false;
						}else{
							if(currentSaved.usedHeroicAction == undefined && dataSaved.heroicAction.hallazgo){
								if((await doAction("/api/beyond/desert/heroic", "POST", {action: "2"})).error){}else{
									currentSaved.usedHeroicAction = true;
									canUseHeroicAction = true;
								}
								dataSaved.heroicAction.hallazgo = false;
							}else{
								if(currentSaved.usedHeroicAction == undefined && dataSaved.heroicAction.retorno && /^~[0]:/.test(attackTime) /* solo usar cuando queda 1 hora */){ 
									if((await doAction("/api/beyond/desert/heroic", "POST", {action: "1"})).error){}else{
										currentSaved.usedHeroicAction = true;
										canUseHeroicAction = true;
										returnedToTown = true;
										dataSaved[`day${currentDay}`].currentStep = dataSaved[`day${currentDay}`].referenceStep + 1;
									}
									dataSaved.heroicAction.retorno = false;
								}else{
									if (/^~[0]:/.test(attackTime)) { // si queda 1 hora o menos acampar
										if(currentSaved.usedHeroicAction == undefined && dataSaved.heroicAction.pa){
											dataSaved.heroicAction.pa = false;
											if((await doAction("/api/beyond/desert/heroic", "POST", {action: "4"})).error){
											}else{
												currentSaved.usedHeroicAction = true;
												canUseHeroicAction = true;
												return await main('/jx/beyond/desert/cached');
											}
										}else{
											const currentPAs = parseInt(await pag.locator('b[data-incidental-target="ap"]').getAttribute('data-value'), 10);
											if(currentSaved.startItems.idInvFood != undefined){
												await moveItem(inv.IdInvDes, inv.IdInvPer, currentSaved.startItems.idInvFood);
											}
											if(currentSaved.startItems.idInvWater != undefined){
												await moveItem(inv.IdInvDes, inv.IdInvPer, currentSaved.startItems.idInvWater);
											}
											if(currentPAs > 0){
												let restPAs = currentPAs;
												for(;restPAs > 0;restPAs--){
													if(restPAs == 1){
														// cavar tumba
														await doAction("/api/beyond/desert/camping ", "POST", {action: "8"});
													}else{
														// mejorar campamento
														await doAction("/api/beyond/desert/camping ", "POST", {action: "7"});
													}
												}
											}else{
												// esconderse
												await doAction("/api/beyond/desert/camping ", "POST", {action: "6"});
											}
											dataSaved[`day${currentDay}`].camping = true;
											dataSaved[`day${currentDay + 1}`] = dataSaved[`day${currentDay}`];
											await goto('/jx/beyond/desert/cached');
											return;
										}
									}
								}
							}
						}
					}
				}
				currentPoss.purged = true;
				console.error(canUseWeapon + ":" + canUseHeroicAction + ":" +canUseWeaponBattery + ":" +purge);
				if(!canUseWeapon && !canUseHeroicAction && !canUseWeaponBattery && (!purge || /^~[0123]:/.test(attackTime))){ // TODO: help en foro
					if(dataSaved.postToDay == undefined){
						if(currentSaved.usedHeroicAction == undefined && dataSaved.heroicAction.retorno ){ // aun con retorno
							if((await doAction("/api/beyond/desert/heroic", "POST", {action: "1"})).error){}else{
								currentSaved.usedHeroicAction = true;
								canUseHeroicAction = true;
								returnedToTown = true;
								dataSaved[`day${currentDay}`].currentStep = dataSaved[`day${currentDay}`].referenceStep + 1;
							}
							dataSaved.heroicAction.retorno = false;
						}else{ // ya no tengo retorno
							if((await doAction("/api/beyond/desert/heroic", "POST", {action: "3"})).error){}else{
								currentSaved.usedHeroicAction = true;
								canUseHeroicAction = true;
							}
							dataSaved.heroicAction.golpe = false;
							return await main('/jx/beyond/desert/cached');
						}
						dataSaved.postToDay = true;
					}
				}else{
					return await main(returnedToTown ? '/jx/town/dashboard' : '/jx/beyond/desert/cached');
				}
			}else{
				// saquear ruina
				const digRuinButton = pag.locator('#dig_ruin_button');
				if(await digRuinButton.count() > 0 && currentPoss.diggedRuin == undefined){ // urgar ruina
					currentPoss.diggedRuin = true;
					await Promise.all([
						pag.waitForResponse(r => r.url().includes('/beyond/'), { timeout: 5000 }).catch(() => {}),
						digRuinButton.click()
					]);
					return await main('/jx/beyond/desert/cached');
				}
				// 2. Si es posible escavar se intentará recolectar recursos antes de moverse.
				const digButton = pag.locator('#dig_button');
				if(await digButton.count() > 0  && currentPoss.digged == undefined){ // escavar
					try{
						await Promise.all([
							pag.waitForResponse(r => r.url().includes('/beyond/'), { timeout: 10000 }).catch(() => {}),
							digButton.click({ timeout: 15000 })
						]);
						currentPoss.digged = true;
					}catch(e){
						console.log("digButton: " + e);
					}finally{
						return await main('/jx/beyond/desert/cached');
					}
				}
				if(!currentPoss.dried){
					currentPoss.dried = await pag
						.locator('#mgd-digging-note img')
						.evaluateAll(imgs =>
							imgs.some(img => img.src.includes('lock'))
						);
				}
				
				// 4. Si faltan 4 horas para el ataque deberá avanzar sin agotar la zona hasta completar la ruta.
				const [mgdZoneNote, attackTime] = await Promise.all([
					pag.locator('#mgd-zone-note').count(),
					pag.locator('div.attack-time').innerText()
				]);
				let inv = await getInventoryIds();
				if (mgdZoneNote > 0 || currentPoss.dried || currentPoss.skipPoss == true ||  (
					/^~[210]:/.test(attackTime) && (currentDay != 1 || await getCurrentCountCitizens() >= 37)
				)) {// moverse
					console.log("Inicia flujo para moverse");
					// 3. Al moverse si no se cuenta con PA's suficientes deberán consumirse los recursos preparados para la ruta.
					const currentPAs = await pag.locator('b[data-incidental-target="ap"]').getAttribute('data-value');
					if(currentPAs == 0){ // consumir
						console.log("No tiene PAs, intenta consumir");
						await takeSurvivalFood(currentSaved, inv);
						let canUseItem = false;
						const actionsHtml = await doAction("/jx/beyond/partial/desert/actions", "POST", {});
						const foodAction = currentSaved?.startItems?.idInvFood !== undefined
							? getActionIdFromHtml(actionsHtml, currentSaved.startItems.idInvFood)
							: null;
						//comer
						if(foodAction == null || (await doAction("/api/beyond/desert/action", "POST", {item: currentSaved.startItems.idInvFood, action: foodAction})).error){
							//tomar agua
							const waterAction = currentSaved?.startItems?.idInvWater !== undefined
								? getActionIdFromHtml(actionsHtml, currentSaved.startItems.idInvWater)
								: null;
							if(waterAction == null || (await doAction("/api/beyond/desert/action", "POST", {item: currentSaved.startItems.idInvWater, action: waterAction})).error){
								// TODO: acción si no logré comer ni tomar agua
							}else{
								currentSaved.startItems.idInvWater = undefined;
								canUseItem = true;
							}
						}else{
							currentSaved.startItems.idInvFood = undefined;
							canUseItem = true;
						}
						if(canUseItem){
							writeJSON(nameFile_dataSaved, dataSaved);
							return await main('/jx/beyond/desert/cached');
						}
					}else{ // moverse
						console.log("Recoge por prioridad antes de moverse");
						const [rawPlayInv, rawDeseInv] = await Promise.all([
							getHttpPlayerInventory(inv),
							getHttpDesertInventory(inv)
						]);
						if (rawPlayInv?.size) {
							setPlayerInv(rawPlayInv.size);
						} else {
							setPlayerInv(await getInventorySize(inv.IdInvPer));
						}
						let playInv = rawPlayInv ? await getListItems(rawPlayInv) : {};
						let deseInv = rawDeseInv ? await getListItems(rawDeseInv) : {};

						const heavyCandidates = currentSaved.route.currentPoss <= 4
							? items.heavyList.slice(0, Math.floor(items.heavyList.length / 2))
							: items.heavyList;
						const lightCandidates = currentSaved.route.currentPoss <= 4
							? items.list.slice(0, Math.floor(items.list.length / 2))
							: items.list;
						const heavySet = new Set(heavyCandidates);
						const lightSet = new Set(lightCandidates);

						const foodKey = currentSaved.startItems.idInvFood != undefined ? String(currentSaved.startItems.idInvFood) : null;
						const waterKey = currentSaved.startItems.idInvWater != undefined ? String(currentSaved.startItems.idInvWater) : null;
						const missingSurvivalInBag =
							(foodKey !== null && !playInv[foodKey] && Boolean(deseInv[foodKey])) ||
							(waterKey !== null && !playInv[waterKey] && Boolean(deseInv[waterKey]));
						const groundHasPickable = Object.values(deseInv).some(it => heavySet.has(it.p) || lightSet.has(it.p));
						let heavyCountInBag = 0;
						let bagHasDisallowed = false;
						for (const [k, it] of Object.entries(playInv)) {
							if (k === foodKey || k === waterKey) continue;
							if (heavySet.has(it.p)) {
								heavyCountInBag++;
								if (heavyCountInBag > 1) {
									bagHasDisallowed = true;
									break;
								}
							} else if (!lightSet.has(it.p)) {
								bagHasDisallowed = true;
								break;
							}
						}

						let zoneModified = false;
						if (missingSurvivalInBag || groundHasPickable || bagHasDisallowed) {
							zoneModified = true;
							if (Object.keys(playInv).length > 0) {
								const dropRes = await dropPlayerInventory(inv);
								if (dropRes?.source) playInv = await getListItems(dropRes.source);
								if (dropRes?.target) deseInv = await getListItems(dropRes.target);
							}
							if(currentSaved.startItems.idInvFood != undefined && deseInv[currentSaved.startItems.idInvFood]){
								const mRes = await moveItem(inv.IdInvDes, inv.IdInvPer, currentSaved.startItems.idInvFood);
								if (mRes?.target) playInv = await getListItems(mRes.target);
								if (mRes?.source) deseInv = await getListItems(mRes.source);
							}
							if(currentSaved.startItems.idInvWater != undefined && deseInv[currentSaved.startItems.idInvWater]){
								const mRes = await moveItem(inv.IdInvDes, inv.IdInvPer, currentSaved.startItems.idInvWater);
								if (mRes?.target) playInv = await getListItems(mRes.target);
								if (mRes?.source) deseInv = await getListItems(mRes.source);
							}
							if (!rawPlayInv?.size && (!dropResSafeSize(playInv))) {
								setPlayerInv(await getInventorySize(inv.IdInvPer));
							}

							let takeHeavy = true;
							while(Object.keys(playInv).length < lastDataSaved.invSize && Object.keys(deseInv).length != 0){
								const candidates = takeHeavy ? heavyCandidates : lightCandidates;
								const itemId = searchItemIdInv(candidates, deseInv);
								if (itemId == undefined) {
									if (takeHeavy) {
										takeHeavy = false;
										continue;
									}
									break;
								}
								let playInvTemp = await moveItem(inv.IdInvDes, inv.IdInvPer, itemId);
								if (playInvTemp == undefined || playInvTemp.error) {
									if (takeHeavy) {
										takeHeavy = false;
										continue;
									}
									break;
								}
								if(playInvTemp.target == undefined || playInvTemp.target == null){
									playInvTemp.target = await getHttpPlayerInventory(inv);
								}
								if(playInvTemp.source == undefined || playInvTemp.source == null){
									playInvTemp.source = await getHttpDesertInventory(inv);
								}
								setPlayerInv(playInvTemp);
								playInv = await getListItems(playInvTemp.target);
								deseInv = await getListItems(playInvTemp.source);
								if (takeHeavy) {
									takeHeavy = false;
								}
							}
						}

						try{
							let pala = searchItemIdInv([319], playInv);
							if(pala != undefined){
								const palaAction = getActionIdFromHtml(await doAction("/jx/beyond/partial/desert/actions", "POST", {}), pala);
								if (palaAction != null) {
									const palaRes = await doAction("/api/beyond/desert/action", "POST", {item: pala, action: palaAction});
									if (!palaRes?.error) {
										zoneModified = true;
									}
								}
							}
						}catch(exception){
							console.log(exception);
						}

						// actualizar GestHordes solo si cambió el suelo/zona desde la sincronización inicial de esta celda
						if (zoneModified) {
							console.log("Actualizar GestHordes");
							await goto('/jx/beyond/desert/cached');
							await pag.waitForSelector('#header-rucksack-items');
							await updateGestHordes();
						}
						// ir a la siguiente posición
						const nextPoss = currentSaved.route.way[currentSaved.route.currentPoss + 1];
						if((await doAction("/api/beyond/desert/move", "POST", { x: nextPoss.x, y: nextPoss.y })).error){
							// TODO: acción si no logré moverme
						}else{
							console.log(`Se mueve a [${nextPoss.x}, ${nextPoss.y}]`);
							currentSaved.route.currentPoss = currentSaved.route.currentPoss + 1;
							return await main('/jx/beyond/desert/cached');
						}
					}
				}
				
			}
		}
	}catch(exception){
		console.log(exception);
	}
}

function dropResSafeSize() {
	return lastDataSaved.invSize != undefined && lastDataSaved.invSize != 5;
}

// flujo para aceptar la muerte cuando la partida termina
async function acceptDead(){
	await pag.waitForSelector('button[x-ajax-href="/jx/game/raventimes"]');
	
	const latestDay = Object.keys(dataSaved)
		.filter(k => /^day\d+$/.test(k))
		.sort((a, b) => parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10))
		.pop();
	await sendTelegramMessage(`Juego Terminado: ${latestDay} en el paso: ${dataSaved[latestDay]?.currentStep}`);
	try {
		await screenshotPromise;
		const gifPath = `./debug/${lastDataSaved?.idTown}.gif`;
		await createGifFromPngs('./debug', gifPath, 250);
		await sendGif(gifPath);
	} catch (exception) {
		console.log('No se pudo generar/enviar el GIF:', exception);
	}
	try {
		fs.rmSync('./debug', { recursive: true, force: true });
		fs.mkdirSync('./debug', { recursive: true });
		gitNeedsFullStage = true;
	} catch (exception) {
		console.log('No se pudo limpiar debug/:', exception);
	}
	
	dataSaved = {};
	lastDataSaved.inv = undefined;
	lastDataSaved.invSize = undefined;
	writeJSON(nameFile_dataSaved, dataSaved);
	
	lastWords = readJSON(lastWordsFile);
	await pag.locator('#last_words').fill(lastWords.dead[Math.floor(Math.random() * lastWords.dead.length)]);
	pag.once('dialog', async dialog => {
		await dialog.accept(); // acepta el alert
	});

	await Promise.all([
		pag.waitForResponse(r => r.url().includes('/soul/') || r.url().includes('/ghost/'), { timeout: 5000 }).catch(() => {}),
		pag.click('#rebirth_btn')
	]);
	return await main('/jx/ghost/welcome');
}

// busca un sitio activo y authentica con las credenciales
async function login(){
	// Se busca servidor activo
	if(!(await nav('https://myhord.es/'))){
		if(!(await nav('https://myhord.de/'))){
			if(!(await nav('https://myhord.eu/'))){
				if(!(await nav('https://myhord.fr/'))){
					return false;
				}
			}
		}
	}
	// Se recupera URL base final que si haya logrado responder
	basePath = new URL(pag.url()).origin;
	
	console.error("Iniciando Login: " + pag.url());
	// Se realiza autenticación
	await pag.goto(basePath + '/jx/public/login', { waitUntil: 'load', timeout: 15000 });
	console.error("Haciendo Login: " + pag.url());
	try{
		const navPromise = pag.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
		try{
			await pag.click('#et_login_button', { timeout: 10000 });
		}catch(exception){
			console.error("No se encontró et_login_button:", exception);
		}
		await navPromise;
		await pag.waitForSelector('input[name="login"]', { state: 'visible', timeout: 10000 });
		await pag.type('input[name="login"]', el0, { delay: 80 });
		await pag.type('input[name="password"]', el1, { delay: 80 });
		console.error("Credenciales asignadas");
		await pag.evaluate(() => {
			const btn = document.querySelector('input[name="sign_in"]');
			if (btn) btn.removeAttribute('disabled');
		});
		console.error("Se dió click a sing in");
		await pag.click('input[name="sign_in"]', { timeout: 6000 });
		await pag.waitForSelector('hordes-header-ui', { state: 'attached', timeout: 15000 });
		console.error("Login Terminado: " + pag.url());
		return true;
	}catch(exception){
		if (exception.name === 'TimeoutError') {
			console.error("Se agotó el tiempo de espera en login (" + pag.url() + "):", exception.message);
		} else {
			console.error("Otro error ocurrió en login (" + pag.url() + "):", exception);
		}
	}
	return false;
}

//flujo para ingresar a un pueblo
async function joinToTown(){
	console.error("Uniendose a un pueblo: " + pag.url());
	let townsAvailable = (await doAction("/rest/v1/game/lobby/list", "GET", {})).towns.filter(
	  item => item.type === 2 &&
			  item.language === "es" &&
			  item.coalitions < item.population
	);
	await dismissPromptIfVisible();
	console.log(townsAvailable);
	await pag.locator('span.link.bold', { hasText: townsAvailable[0].name }).click();
	await pag.waitForSelector('button.modal-button.small.inline', {state: 'visible', timeout: 5000});

	const buttons = pag.locator('button.modal-button.small.inline');
	const joinButton = buttons.nth(1);
	await pag.waitForFunction(() => {
		const btns = document.querySelectorAll('button.modal-button.small.inline');
		return btns[1] && !btns[1].disabled;
	}, { timeout: 10000 });
	await joinButton.click();

	await selectJob();
}

// se elije una profecion junto con sus habilidades
async function selectJob(){
	lastDataSaved.idTown = await (await pag.waitForSelector('hordes-town-onboarding', {state: 'attached', timeout: 10000 })).getAttribute('data-town');
	writeJSON(nameFile_lastDataSaved, lastDataSaved);
	
	await doAction("/rest/v1/game/welcome/" + lastDataSaved.idTown, "PATCH", {"identity": null, "profession": {"id": 3}, 
	// TODO: FUNCTION TO UPDATE LAST ID UPGRADES AVAILABLES
	//"skills": {"ids": [28, 32, 36, 40, 44]}});
	"skills": {"ids": [25, 29, 33, 37, 41]}});
	try {
		await updateGestHordesPromise();
	} catch (err) {
		console.error("No se logró actualizar GestHordes del nuevo pueblo:", err.message || err);
	}
	return await main('/jx/town/dashboard');
}

/*
	--------------------------
	UTILERIAS
	--------------------------
*/
// localiza la extensión MHO: instalación local de Edge, caché del repo o descarga desde la Chrome Web Store
async function resolveExtensionPath(){
	const extensionId = 'jolghobcgphmgaiachbipnpiimmgknno';
	// instalación local de Edge (Windows)
	if(process.env.LOCALAPPDATA){
		const basepath = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'Extensions', extensionId);
		try {
			const found = fs.readdirSync(basepath, { withFileTypes: true })
				.filter(dirent => dirent.isDirectory())
				.map(dirent => path.join(basepath, dirent.name))[0];
			if(found){
				return found;
			}
		} catch (err) {
			console.error('Error al leer la carpeta:', err);
		}
	}
	// caché de una descarga previa
	const cacheDir = path.join(".", "tests", "extension", extensionId);
	if(fs.existsSync(path.join(cacheDir, 'manifest.json'))){
		return cacheDir;
	}
	// descarga desde la Chrome Web Store
	try {
		const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=126.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
		const response = await fetch(url);
		if(!response.ok){
			throw new Error(`HTTP ${response.status}`);
		}
		const crx = Buffer.from(await response.arrayBuffer());
		// formato CRX3: 'Cr24' + versión + tamaño de cabecera; el zip inicia después de la cabecera
		const headerSize = crx.readUInt32LE(8);
		const zipBuffer = crx.subarray(12 + headerSize);
		new AdmZip(zipBuffer).extractAllTo(cacheDir, true);
		return cacheDir;
	} catch (err) {
		console.error('No fue posible descargar la extensión:', err);
		return undefined;
	}
}
// navegación en url myhordes
async function goto(path){
	try {
		let response = await pag.goto(basePath + path, { waitUntil: 'domcontentloaded', timeout: 15000 });
		return Boolean(response && response.status() == 200);
	} catch (err) {
		return false;
	}
}
// navegación en url completa
async function nav(url){
	try {
		let response = await pag.goto(url, { waitUntil: 'load', timeout: 15000 });
		return Boolean(response && response.status() == 200);
	} catch (err) {
		return false;
	}
}
// ejecuta cualquier petición http en MyHordes
async function doAction(endpoint, method, bodyData) {
	const origin = basePath || new URL(pag.url()).origin;
	const response = await pag.request.fetch(origin + endpoint, {
		method,
		headers: {
		"Accept": "application/json",
		"Content-Type": "application/json",
		"x-requested-with": "XMLHttpRequest"
		},
		data: (method !== "GET" && method !== "HEAD") ? bodyData : undefined
	});
	const contentType = response.headers()["content-type"];
	let result;
	if (contentType && contentType.includes("application/json")) {
		try{
			result = await response.json();
			logTrace(endpoint, method, bodyData, response?.status(), result);
		}catch(err){
			result = await response.text();
			logTrace(endpoint, method, bodyData, response?.status());
		}
	} else {
		result = await response.text();
		logTrace(endpoint, method, bodyData, response?.status());
	}
	return result;
}
// leer JSON desde archivo
function readJSON(filePath) {
	const data = fs.readFileSync(filePath);
	//console.log(data);
	return JSON.parse(data);
}
// escribir JSON en archivo
function writeJSON(filePath, data) {
	const normPath = path.normalize(filePath);
	if (normPath.endsWith(path.normalize('data/gestHordes.json'))) {
		cachedGestHordes = data;
	} else if (normPath.endsWith(path.normalize('data/weapons.json'))) {
		cachedWeapons = data;
	}

	let serialized;
	try {
		serialized = JSON.stringify(data, null, 2);
		if (writtenJsonCache.get(normPath) === serialized && fs.existsSync(filePath)) {
			return;
		}
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, serialized);
		writtenJsonCache.set(normPath, serialized);
	} catch(error){
		//console.error(`Error al crear cambios para archivo ${filePath} en temporal: `, error.message);
	}
	
	if (deferGitPush) {
		pendingGitPaths.add(filePath);
		return;
	}

	// Agregar y commitear cambios inmediatamente fuera de 'myhordes'
	try{
		retryPush(filePath, 4);
		console.log(`Archivo ${filePath} actualizado`);
	} catch(error){
		//console.error(`Error al guardar cambios para archivo ${filePath} en GitHub: `, error.message);
	}
}

function ensureGitConfig() {
	if (gitConfigured) return;
	execSync('git config user.name "github-actions[bot]"');
	execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
	gitConfigured = true;
}

function pushWithRetries(m = 3) {
	if (!process.env.GITHUB_REPOSITORY && !process.env.CI) {
		return;
	}
	const remoteUrl = process.env.GITHUB_REPOSITORY
		? `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`
		: 'origin';
	for (let i = 0; i < m; i++) {
		try {
			execSync(`git pull --rebase ${remoteUrl} main`);
			execSync(`git push ${remoteUrl} HEAD:main`);
			break;
		} catch (e) {
			if (i === (m - 1)) {
				console.log("no se logró guardar cambios");
			} else {
				try {
					execSync('git add -A');
					execSync('git commit -m "file changed: ."');
				} catch (_) {}
			}
		}
	}
}

function flushGitChanges() {
	if (!gitNeedsFullStage && pendingGitPaths.size === 0) {
		return;
	}
	try {
		ensureGitConfig();
		if (gitNeedsFullStage && fs.existsSync('./debug')) {
			execSync('git add -A ./debug');
		}
		if (pendingGitPaths.size > 0) {
			const quoted = [...pendingGitPaths].map(p => `"${p}"`).join(' ');
			execSync(`git add ${quoted}`);
		}
		const staged = execSync('git status --porcelain').toString().trim();
		if (!staged) {
			pendingGitPaths.clear();
			gitNeedsFullStage = false;
			return;
		}
		execSync('git commit -m "bot: batch state and log update"');
		pushWithRetries(4);
		pendingGitPaths.clear();
		gitNeedsFullStage = false;
	} catch (error) {
		console.log("Aviso al sincronizar lote git:", error.message || error);
	}
}

function retryPush(filePath = ".", m = 3){
	ensureGitConfig();
	execSync(`git add "${filePath}"`);
	try {
		execSync(`git commit -m "file changed: ${filePath}"`);
	} catch (e) {
		return;
	}
	pushWithRetries(m);
}

// obtiene el tamaño maximo del inventario
async function getInventorySize(idInv){
	if(lastDataSaved.invSize != undefined){
		return lastDataSaved.invSize;
	}
	if(idInv == undefined){
		return undefined;
	}
	const listItems = await doAction("/rest/v1/game/inventory/" + idInv, "GET", {});
	if(listItems != undefined){
		return listItems.size;
	}else{
		return undefined;
	}
}
// obtiene el listado de items existentes en inventario indicado
async function getInventory(idInv){
	if(idInv == undefined){
		return undefined;
	}
	console.log("idInv: " + idInv);
	let temp = await doAction("/rest/v1/game/inventory/" + idInv, "GET", {});
	//console.log("TEMP: " + temp);
	return await getListItems(temp);
}
async function getHttpResponseInventory(idInv){
	if(idInv == undefined){
		return undefined;
	}
	return await doAction("/rest/v1/game/inventory/" + idInv, "GET", {});
}
// obtiene el listado de items existentes en inventario indicado
async function getListItems(listItems){
	const items = {};
	if(listItems.categories){
		for (let i = 0; i < listItems.categories.length; i++) {
			let cat = listItems.categories[i];
			for (let j = 0; j < cat.items.length; j++) {
				let item = cat.items[j];
				items[item.i]={c:item.c,p:item.p};
			}
		}
	}else{
		for (let i = 0; i < listItems.items.length; i++) {
			let item = listItems.items[i];
			items[item.i]={c:item.c,p:item.p};
		}
	}
	return items;
}
// obtiene el listado de items existentes en el almacen
async function getStorageInventory(inv) {
	return await getInventory(inv.IdInvSto);
}
// obtiene el listado de items existentes en el inventario del jugador
async function getPlayerInventory(inv) {
	return await getInventory(inv.IdInvPer);
}
// obtiene el listado de items existentes en el baul
async function getBaulInventory(inv) {
	return await getInventory(inv.IdInvBau);
}
// obtiene el listado de items existentes en el desierto
async function getDesertInventory(inv) {
	return await getInventory(inv.IdInvDes);
}
// obtiene el listado de items existentes en el inventario del jugador
async function getHttpPlayerInventory(inv) {
	return await getHttpResponseInventory(inv.IdInvPer);
}
// obtiene el listado de items existentes en el desierto
async function getHttpDesertInventory(inv) {
	return await getHttpResponseInventory(inv.IdInvDes);
}
function extractHordesInventoryIds(htmlText) {
	if (!htmlText) return null;
	const tagMatch = htmlText.match(/<hordes-inventory\b[^>]*>/i);
	if (tagMatch) {
		const tag = tagMatch[0];
		const aMatch = tag.match(/data-inventory-a-id="([^"]+)"/i);
		const bMatch = tag.match(/data-inventory-b-id="([^"]+)"/i);
		return {
			aId: aMatch ? aMatch[1] : null,
			bId: bMatch ? bMatch[1] : null
		};
	}
	const el = new JSDOM(htmlText).window.document.querySelector("hordes-inventory");
	return el ? {
		aId: el.getAttribute("data-inventory-a-id"),
		bId: el.getAttribute("data-inventory-b-id")
	} : null;
}

// recupera los ids de los inventarios Personal, Storage y Baul
// @return: inv : {IdInvPer, IdInvSto, IdInvBau, IdInvDes}
async function getInventoryIds() {
	try {
		currentPath = new URL(pag.url()).pathname;
		if(currentPath != "/jx/beyond/desert/cached"){
			if(lastDataSaved.inv != undefined){
				if (lastDataSaved.inv.IdInvPer) {
					idPlayerInv = lastDataSaved.inv.IdInvPer;
				}
				return lastDataSaved.inv;
			}else{
				const [bankHtml, houseHtml] = await Promise.all([
					doAction("/jx/town/bank", "GET", {}),
					doAction("/jx/town/house/dash", "GET", {})
				]);
				const bankIds = extractHordesInventoryIds(bankHtml);
				if (bankIds) {
					const IdInvPer = bankIds.aId;
					if(IdInvPer){
						idPlayerInv = IdInvPer;
					}
					const IdInvSto = bankIds.bId;
					const houseIds = extractHordesInventoryIds(houseHtml);
					if(houseIds){
						const IdInvBau = houseIds.bId;
						lastDataSaved.inv = {
							IdInvPer: IdInvPer,
							IdInvSto: IdInvSto,
							IdInvBau: IdInvBau
						};
						return { IdInvPer, IdInvSto, IdInvBau };
					} else {
						console.error("No se encontró el elemento <hordes-inventory> en el HTML.");
						return undefined;
					}
				}
			}
		}else{
			// Primero intentar leer directamente del DOM actual sin hacer otro POST ni instanciar JSDOM
			const domIds = await pag.locator('hordes-inventory').first().evaluate(el => ({
				aId: el.getAttribute('data-inventory-a-id'),
				bId: el.getAttribute('data-inventory-b-id')
			})).catch(() => null);
			const desertIds = (domIds && domIds.aId && domIds.bId)
				? domIds
				: extractHordesInventoryIds(await doAction("/jx/beyond/desert/cached", "POST", {}));
			if (desertIds) {
				const IdInvPer = desertIds.aId;
				if(IdInvPer){
					idPlayerInv = IdInvPer;
				}
				const IdInvDes = desertIds.bId;
				
				return { IdInvPer, IdInvDes };
			} else {
				console.error("No se encontró el elemento <hordes-inventory> en el HTML.");
				return undefined;
			}
		}
	} catch (error) {
		console.error("Error al obtener los IDs:", error);
	}
	return undefined;
}
// cierra el portal del pueblo
async function closePortal(){
	return await doAction("/rest/v1/game/town/core/door", "PATCH", {action: "close"});
}
// utiliza un objeto del almacen y lo regresa
async function UseAndReturn(inv, storageInventory, item, act){
	let stoInv = searchItemIdInv([item], storageInventory);
	if(stoInv){
		const upRes = await doAction("/rest/v1/game/inventory/"+inv.IdInvSto+"/"+stoInv, "PATCH", {d: "up", mod: null, to: inv.IdInvPer});
		const playerItems = upRes?.target ? await getListItems(upRes.target) : await getPlayerInventory(inv);
		let plaInv = searchItemIdInv([item], playerItems);
		if(plaInv){
			const actionId = getActionIdFromHtml(await doAction("/jx/town/house/dash", "POST", {}), plaInv);
			if (actionId != null) {
				await doAction("/api/town/house/action", "POST", {item: plaInv, action: actionId});
			}
			const downRes = await doAction("/rest/v1/game/inventory/"+inv.IdInvPer+"/"+plaInv, "PATCH", {d: "down", mod: null, to: inv.IdInvSto});
			return {
				used: true,
				storageInventory: downRes?.target ? await getListItems(downRes.target) : undefined
			};
		}
	}
	return { used: false, storageInventory };
}
function getActionIdFromHtml(htmlText, provokingId) {
	if (!htmlText || provokingId == undefined) return null;
	const targetId = String(provokingId);
	const liRegex = /<li\b[^>]*>/gi;
	let match;
	while ((match = liRegex.exec(htmlText)) !== null) {
		const tag = match[0];
		const provMatch = tag.match(/\bx-provoking-id="([^"]+)"/i);
		if (provMatch && provMatch[1] === targetId) {
			const actMatch = tag.match(/\bx-action-id="([^"]+)"/i);
			return actMatch ? actMatch[1] : null;
		}
	}
	const doc = new JSDOM(htmlText).window.document;
	const li = doc.querySelector(`li[x-provoking-id="${targetId}"]`);
	return li ? li.getAttribute("x-action-id") : null;
}

// mueve un objeto entre inventarios
async function moveItem(fromIdInv, toIdInv, id){
	let dir = "";
	if(fromIdInv == idPlayerInv){
		dir = "down";
	}else {
		dir = "up";
	}
	return (await doAction("/rest/v1/game/inventory/"+fromIdInv+"/"+id, "PATCH", {d: dir, mod: null, to: Number(toIdInv)}));
}
// busca y mueve un objeto entre inventarios
async function searchMoveItem(fromIdInv, toIdInv, arrItemsToSearch, cachedFromInv = undefined){
	const fromInv = cachedFromInv ?? await getInventory(fromIdInv);
	let id = searchItemIdInv(arrItemsToSearch, fromInv);
	if(id != undefined){
		return await moveItem(fromIdInv, toIdInv, id);
	} else {
		return undefined;
	}
}
// devuelve todo el contenido del inventario Personal al Storage o Desierto
async function dropPlayerInventory(inv){
	if(inv.IdInvSto != undefined){
		return await doAction("/rest/v1/game/inventory/" + inv.IdInvPer, "PATCH", {d: "down-all", mod: null, to: inv.IdInvSto});
	}
	if(inv.IdInvDes != undefined){
		return await doAction("/rest/v1/game/inventory/" + inv.IdInvPer, "PATCH", {d: "down-all", mod: null, to: inv.IdInvDes});
	}
	return undefined;
}
// recupera objetos del almacen para una exploracion
async function prepareToExplore(inv, storageInventory){
	const currentDate = getFormattedDate();
	if(dataSaved.test == undefined){
		dataSaved.test = {};
	}
	dataSaved.test[currentDate] = {};
	
	//tirar inventario
	const dropRes = await doAction("/rest/v1/game/inventory/" + inv.IdInvPer, "PATCH", {d: "down-all", mod: null, to: inv.IdInvSto});
	if (dropRes?.target) {
		storageInventory = await getListItems(dropRes.target);
	}
	let latestPlayerInv = dropRes?.source ? await getListItems(dropRes.source) : undefined;

	const waters = items.waters.map(water => water.id);
	const wellRes = await doAction("/rest/v1/game/town/facilities/well", "GET", {});
	if(wellRes.error){
		let idW = searchItemIdInv(waters, storageInventory);
		if(idW){
			const wRes = await doAction("/rest/v1/game/inventory/"+inv.IdInvSto+"/"+idW, "PATCH", {d: "up", mod: null, to: inv.IdInvPer});
			if (wRes?.target) latestPlayerInv = await getListItems(wRes.target);
			if (wRes?.source) storageInventory = await getListItems(wRes.source);
		}
	} else {
		latestPlayerInv = undefined;
	}
	const foods = items.foods.map(food => food.id);
	//recoger comida
	let abrelatas = searchItemIdInv([12,17,20,140], storageInventory);
	let idF = searchItemIdInv(abrelatas?foods:foods.slice(1), storageInventory);
	if(idF){
		let actInv = await doAction("/rest/v1/game/inventory/"+inv.IdInvSto+"/"+idF, "PATCH", {d: "up", mod: null, to: inv.IdInvPer});
		if (actInv?.target) latestPlayerInv = await getListItems(actInv.target);
		if (actInv?.source) storageInventory = await getListItems(actInv.source);
		if(actInv?.success){
			//evalua si se recogió una lata
			let hasLata = searchItemIdInv([3], latestPlayerInv ?? await getPlayerInventory(inv));
			dataSaved.test[currentDate].hasLata = hasLata;
			if(hasLata){
				//recoge abre latas
				actInv = await doAction("/rest/v1/game/inventory/"+inv.IdInvSto+"/"+abrelatas, "PATCH", {d: "up", mod: null, to: inv.IdInvPer});
				if(actInv?.success){
					//abre la lata
					const lataAction = getActionIdFromHtml(await doAction("/jx/town/house/dash", "POST", {}), hasLata);
					if (lataAction != null) {
						await doAction("/api/town/house/action", "POST", {item: hasLata, action: lataAction});
					}
					latestPlayerInv = await getPlayerInventory(inv);
					if(abrelatas = searchItemIdInv([12,17,20,140], latestPlayerInv)){
						dataSaved.test[currentDate].abrelatas = abrelatas;
						//regresa el abre latas
						const retRes = await doAction("/rest/v1/game/inventory/"+inv.IdInvPer+"/"+abrelatas, "PATCH", {d: "down", mod: null, to: inv.IdInvSto});
						if (retRes?.source) latestPlayerInv = await getListItems(retRes.source);
					}
				}else{
					// regresa la lata
					const retLata = await doAction("/rest/v1/game/inventory/"+inv.IdInvPer+"/"+hasLata, "PATCH", {d: "down", mod: null, to: inv.IdInvSto});
					if (retLata?.target) storageInventory = await getListItems(retLata.target);
					idF = searchItemIdInv(foods.slice(1), storageInventory);
					if (idF) {
						actInv = await doAction("/rest/v1/game/inventory/"+inv.IdInvSto+"/"+idF, "PATCH", {d: "up", mod: null, to: inv.IdInvPer});
						if (actInv?.target) latestPlayerInv = await getListItems(actInv.target);
					}
				}
			}
			//evalua si se recogió un doggybag
			let tempPlayerInv = latestPlayerInv ?? await getPlayerInventory(inv);
			let hasDoggyBag = searchItemIdInv([118], tempPlayerInv);
			dataSaved.test[currentDate].hasDoggyBag2 = hasDoggyBag;
			if(hasDoggyBag){
				//abre doggy-bag
				let doActionObj = await doAction("/jx/town/house/dash", "POST", {});
				let getActionIdFromHtmlObj = getActionIdFromHtml(doActionObj, hasDoggyBag);
				dataSaved.test[currentDate].getActionIdFromHtmlObj = getActionIdFromHtmlObj;
				if (getActionIdFromHtmlObj != null) {
					await doAction("/api/town/house/action", "POST", {item: hasDoggyBag, action: getActionIdFromHtmlObj});
					latestPlayerInv = undefined;
				}
			}
		}
	}
	let pI = latestPlayerInv ?? await getPlayerInventory(inv);
	return {idFood:searchItemId(foods, pI), idWater:searchItemId(waters, pI), idInvFood:searchItemIdInv(foods, pI), idInvWater:searchItemIdInv(waters, pI)}
}
// busca un item en un inventario ya sea Baul, Personal o Storage
function searchItemIdInv(arrItemsToSearch, arrItemsStorage) {
	for (let item in arrItemsStorage) {
		for (let i = 0; i < arrItemsToSearch.length; i++) {
			if(arrItemsToSearch[i] === arrItemsStorage[item].p){
				return item.toString();
			}
		}
	}
	return undefined;
}
function searchItemId(arrItemsToSearch, arrItemsStorage) {
	for (let item in arrItemsStorage) {
		for (let i = 0; i < arrItemsToSearch.length; i++) {
			if(arrItemsToSearch[i] === arrItemsStorage[item].p){
				return arrItemsToSearch[i];
			}
		}
	}
	return undefined;
}
// consulta a gesthordes
async function getGestHordes(){
	if (cachedGestHordes !== null) {
		return cachedGestHordes;
	}
	const raw = await readFile('./data/gestHordes.json', 'utf-8');
	cachedGestHordes = JSON.parse(raw);
	return cachedGestHordes;
}
async function getWeaponsGestHordes() {
	if (cachedWeapons !== null) {
		return cachedWeapons;
	}
	const raw = await readFile('./data/weapons.json', 'utf-8');
	cachedWeapons = JSON.parse(raw);
	return cachedWeapons;
}

// actualiza GestHordes
async function updateGestHordes(){
	// activar actualización de herramientas externas (una sola vez por sesión)
	try{
		if(!externalTools) {
			await pag.waitForSelector('.mho-new-changelog, #synchronize_external_tools', { state: 'attached', timeout: 5000 });
			await pag.evaluate(() => {
				const el = document.querySelector('.mho-new-changelog');
				if (el) {
					el.classList.add('mho-btn-opened');
				}
			});
			try{
				let syncExtTools = await asegurarCheckedLi('#synchronize_external_tools', { timeout: 3000 });
				if(syncExtTools){
					console.log("Se logró activar #synchronize_external_tools");
				}else{
					console.log("No se logró activar #synchronize_external_tools");
				}
			}catch(exception){
				console.log("No se logró activar #synchronize_external_tools: " + exception);
			}
			await pag.check('#synchronize_external_tools_input', { timeout: 2500 }).catch(() => {});
			await pag.evaluate(() => {
				const el = document.querySelector('.mho-new-changelog');
				if (el) {
					el.classList.remove('mho-btn-opened');
				}
			}).catch(() => {});
			externalTools = true;
		}
	}catch(exception){
		console.log("No se reconoce activo las ExternalTools" + exception);
	}
	if(externalTools){
		try{
			const logLink = pag.locator('.log-complete-link').first();
			if (await logLink.isVisible().catch(() => false)) {
				await Promise.all([
					pag.waitForResponse(r => r.url().includes('/beyond/'), { timeout: 2500 }).catch(() => {}),
					logLink.click({ timeout: 1500 }).catch(() => {})
				]);
			}
		}catch(exception){
			console.log("No se logró abrir el log completo del desierto: " + exception);
		}
		try{
			await pag.waitForFunction(() => {
				const content = document.querySelector('#content');
				if (!content) return false;
				return Boolean(
					document.querySelector('#mh-update-external-tools') ||
					content.querySelector('[class*="mho"], [id*="mho"], img[src^="chrome-extension://"]') ||
					(content.textContent && content.textContent.includes('MHO Addon'))
				);
			}, { timeout: 3500 }).catch(() => {});

			const updateBtn = pag.locator('#mh-update-external-tools');
			if (await updateBtn.isVisible().catch(() => false)) {
				const txt = ((await updateBtn.textContent().catch(() => '')) || '').toLowerCase();
				if (!txt.includes('actualizando') && !txt.includes('updating')) {
					await updateBtn.click({ timeout: 2000 }).catch(() => {});
				}
			}

			await pag.waitForFunction(() => {
				const btn = document.querySelector('#mh-update-external-tools');
				if (!btn) return true;
				const style = window.getComputedStyle(btn);
				return style.display === 'none' || style.visibility === 'hidden';
			}, { timeout: 6000 }).catch(() => {});
		}catch(exception){
			console.log("Hordes: " + exception);
		}
	}else{
		console.log("No fue posible actualizar GestHordes");
	}
}
// Evalúa un archivo binario comprimido de rutas (.bin.br) directamente en el Buffer sin crear millones de arreglos intermedios
async function findBestRouteFromBinary(filename, map, villX, villY, tGroupControl) {
	const stats = fs.statSync(filename);
	if (stats.size === 0) {
		throw new Error(`El archivo ${filename} está vacío. Regenera el archivo .bin.br`);
	}

	const fileStream = fs.createReadStream(filename, { highWaterMark: 256 * 1024 });
	const brotliStream = zlib.createBrotliDecompress({ chunkSize: 512 * 1024 });
	fileStream.pipe(brotliStream);

	let pendingBuffer = Buffer.alloc(0);
	let tFOpt = -1;
	let bestRouteSlice = null;

	for await (const chunk of brotliStream) {
		pendingBuffer = pendingBuffer.length === 0 ? chunk : Buffer.concat([pendingBuffer, chunk]);
		let offset = 0;
		const bufLen = pendingBuffer.length;

		while (offset + 2 <= bufLen) {
			const routeLength = pendingBuffer.readUInt16LE(offset);
			const routeSizeBytes = 6 + (routeLength - 1) * 2;
			if (offset + routeSizeBytes > bufLen) {
				break;
			}

			let x = pendingBuffer.readInt16LE(offset + 2);
			let y = pendingBuffer.readInt16LE(offset + 4);
			let row = map[villY - y];
			let zone = row ? row[x + villX] : undefined;

			if (zone !== undefined && !(zone.zombie_estim != null && zone.zombie_estim > tGroupControl)) {
				let tOpt = zone.opt;
				let zonePrev = zone;
				let valid = true;
				let co = offset + 6;
				const endCo = offset + routeSizeBytes;

				while (co < endCo) {
					x += (pendingBuffer[co] << 24) >> 24;
					y += (pendingBuffer[co + 1] << 24) >> 24;
					co += 2;

					row = map[villY - y];
					zone = row ? row[x + villX] : undefined;
					if (zone === undefined) {
						valid = false;
						break;
					}
					tOpt += zone.opt;
					const ze = zone.zombie_estim;
					if (ze != null) {
						if (ze > tGroupControl) {
							valid = false;
							break;
						}
					} else if (zonePrev.zombie_estim != null && zonePrev.zombie_estim >= (tGroupControl - 1)) {
						valid = false;
						break;
					}
					zonePrev = zone;
				}

				if (valid && tOpt > tFOpt) {
					tFOpt = tOpt;
					bestRouteSlice = Buffer.from(pendingBuffer.subarray(offset, offset + routeSizeBytes));
				}
			}

			offset += routeSizeBytes;
		}

		if (offset > 0) {
			pendingBuffer = offset === bufLen ? Buffer.alloc(0) : pendingBuffer.subarray(offset);
		}
	}

	const way = [];
	if (bestRouteSlice !== null) {
		const rl = bestRouteSlice.readUInt16LE(0);
		let x = bestRouteSlice.readInt16LE(2);
		let y = bestRouteSlice.readInt16LE(4);
		way.push({ x, y });
		for (let i = 1, co = 6; i < rl; i++, co += 2) {
			x += bestRouteSlice.readInt8(co);
			y += bestRouteSlice.readInt8(co + 1);
			way.push({ x, y });
		}
	}
	return way;
}

// crea una ruta basada en GestHordes
async function getRoute(PAs, tGroupControl = 3, cachedMap = null, cachedVillage = null){
	let map = cachedMap;
	let village = cachedVillage;
	if (!map || !village) {
		gestHorderData = await getGestHordes();
		const zones = gestHorderData.data.carte.zones;
		map = [];
		for (const key in zones) {
			const zone = zones[key];
			const { x, y } = zone;
			if (!map[y]) {
				map[y] = [];
			}
			zone.opt =
				((zone.fouille_lvl != null) ? zone.fouille_lvl : ((zone.dried) ? 0 : 2))
				+ ((zone.bat_id != null && !zone.empty) ? 1 : 0);
			map[y][x] = zone;
		}
		village = getVillageInfo();
	}

	// Se cierra el total de PAs a un numero par
	const tPAs = Math.floor( PAs / 2 ) * 2;
	if (tPAs < 2) {
		return {};
	}
	
	// 1. se generan todas las rutas posibles en cada dirección con los PAs indicados
	await createRoutes(tPAs);
	
	// 2. se ponderan las rutas directamente sobre el stream binario y se recupera la mas alta
	const routeFile = path.join(constFile, `routes_${tPAs}.bin.br`);
	const way = await findBestRouteFromBinary(routeFile, map, village.x, village.y, tGroupControl);
	let rutaOpt = { way };

	// 3. agrega cuenta e información de zonas agotadas para determinar segun el día actual si vale la pena hacer o no la ruta
	rutaOpt.tNotDried = -2;
	rutaOpt.tOpt = -4;
	for (let p of rutaOpt.way) {
		const zone = map[village.y - p.y][p.x + village.x];
		p.dried = zone.dried;
		p.opt = zone.opt;
		rutaOpt.tOpt += p.opt;
		if(p.dried == null){
			p.dried = false;
		}
		if(!zone.dried){
			rutaOpt.tNotDried++;
		}
	}
	console.log(`PAs: [${tPAs}], tOpt: [${rutaOpt.tOpt}]`);
	rutaOpt.currentPoss = 0;
	let lessPAs = {};
	if(tPAs > 2){
		lessPAs = await getRoute(tPAs - 2, tGroupControl, map, village);
	}else{
		return rutaOpt;
	}
	if(Object.keys(lessPAs).length !== 0 && lessPAs.tOpt > (Math.sqrt(tPAs - 2) + 1) && lessPAs.tOpt >= rutaOpt.tOpt - 1){
		rutaOpt = lessPAs;
	}
	if(rutaOpt.tOpt > (((Math.sqrt(tPAs) / tPAs) * (tPAs - 2)) * 2 )){
		return rutaOpt;
	}else{
		return {};
	}
}

/*
test('route', async ({ page }) => {
	createRoutes(4);
	createRoutes(6);
	createRoutes(8);
	createRoutes(10);
	createRoutes(12);
	createRoutes(14);
	createRoutes(16);
	//createRoutes(18);
	//createRoutes(20);
	//createRoutes(22);

	//createRoutes(24);
	//createRoutes(26);
	//createRoutes(28);
	//createRoutes(30);
	//createRoutes(32);
	//createRoutes(34);
	//createRoutes(36);
	//createRoutes(38);
	//createRoutes(40);
	
	let PAs = 8;
	for await (const chunk of loadRoutesInChunks(path.join(constFile, `routes_${PAs}.json`), 32)) {
		for (let ruta of chunk) {
			for (let p of ruta) {
				
				console.log(`(${p[0]}, ${p[1]})`);
			}
		}
	}
});
*/
//Crea todas las rutas posibles existentes con la cantidad de PA dados desde el origen indicado
function* generateRoutesGen(PAs, Ox = 0, Oy = 0, x = 0, y = 0, currentPA = 0, path = [], visited = new Set(), seenRoutes = new Set()) {
    if (currentPA === PAs) {
        if (Ox === x && Oy === y) {
            let fullPath = [...path, [x,y]];
            let routeKey = fullPath.map(p => `${p[0]},${p[1]}`).join("|");
            let reverseKey = [...fullPath].reverse().map(p => `${p[0]},${p[1]}`).join("|");
            if (seenRoutes.has(reverseKey)) {
                return;
            }

            seenRoutes.add(routeKey);
            yield fullPath;
        }
        return;
    }

    let moves = [
        {dx: 1, dy: 0},   // derecha
        {dx: -1, dy: 0},  // izquierda
        {dx: 0, dy: 1},   // arriba
        {dx: 0, dy: -1}   // abajo
    ];

    for (let move of moves) {
        let newX = x + move.dx;
        let newY = y + move.dy;

        let posKey = `${newX},${newY}`;
        if (visited.has(posKey)) {
            continue;
        }

        let newPath = [...path, [x,y]];
        let newVisited = new Set(visited);
        newVisited.add(posKey);

        yield* generateRoutesGen(PAs, Ox, Oy, newX, newY, currentPA+1, newPath, newVisited, seenRoutes);
    }
}
class RouteToBinaryStream extends Transform {
    constructor() {
        super({ objectMode: true }); // Recibe objetos (arrays), emite Buffers
    }

    _transform(route, encoding, callback) {
        if (!route || route.length === 0) return callback();

        // Tamaño: 2 (longitud) + 4 (primer punto X,Y) + (longitud - 1) * 2 (deltas dx,dy)
        const size = 2 + 4 + (route.length - 1) * 2;
        const buf = Buffer.alloc(size);
        let offset = 0;

        // 1. Longitud de la ruta
        buf.writeUInt16LE(route.length, offset);
        offset += 2;

        // 2. Primer punto (coordenadas absolutas)
        buf.writeInt16LE(route[0][0], offset);
        offset += 2;
        buf.writeInt16LE(route[0][1], offset);
        offset += 2;

        // 3. Puntos siguientes (deltas: diferencias respecto al anterior)
        for (let i = 1; i < route.length; i++) {
            buf.writeInt8(route[i][0] - route[i-1][0], offset); // dx
            offset += 1;
            buf.writeInt8(route[i][1] - route[i-1][1], offset); // dy
            offset += 1;
        }

        this.push(buf);
        callback();
    }
}


async function createRoutes(PAs, Ox = 0, Oy = 0) {
    const filePath = path.join(process.cwd(), 'tests/constants', `routes_${PAs}.bin.br`);

    if (fs.existsSync(filePath)) {
        return {};
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath);
        const brotliStream = zlib.createBrotliCompress({
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } // Nivel 9 es más estable en memoria
        });
        const binaryStream = new RouteToBinaryStream();

        binaryStream.pipe(brotliStream).pipe(fileStream);

        fileStream.on('error', reject);
        brotliStream.on('error', reject);
        binaryStream.on('error', reject);

        let count = 0;
        const generator = generateRoutesGen(PAs, Ox, Oy);

        // Función que maneja la escritura respetando la capacidad del stream
        const writeNext = () => {
            let canWrite = true;
            
            while (canWrite) {
                const result = generator.next();
                
                // Si el generador terminó, cerramos el stream
                if (result.done) {
                    binaryStream.end();
                    return;
                }

                // Escribimos la ruta. write() devuelve false si el buffer interno está lleno
                canWrite = binaryStream.write(result.value);
                count++;

                // 📊 Log de progreso cada 50,000 rutas (ajusta según necesites)
                // Esto es CRUCIAL para saber que el proceso no se colgó en PAs 18
                if (count % 50000 === 0) {
                    console.log(`⏳ Generadas ${count.toLocaleString()} rutas... (PAs: ${PAs})`);
                }

                // ⚠️ MANEJO DE BACKPRESSURE:
                // Si el buffer está lleno, dejamos de escribir y esperamos al evento 'drain'
                if (!canWrite) {
                    binaryStream.once('drain', writeNext);
                    return;
                }
            }
        };

        // Iniciar el ciclo de escritura
        writeNext();

        // Cuando todo se haya escrito físicamente en el disco
        fileStream.on('finish', () => {
            console.log(`✅ Se guardaron y comprimieron ${count.toLocaleString()} rutas en ${filePath}`);
            
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                reject(new Error(`El archivo ${filePath} se generó con 0 bytes.`));
                return;
            }

            if (deferGitPush) {
                pendingGitPaths.add(filePath);
            } else {
                try {
                    retryPush(filePath);
                    console.log(`📦 Archivo ${filePath} actualizado en GitHub`);
                } catch (error) {
                    console.error(`❌ Error al guardar cambios para archivo ${filePath}:`, error.message);
                }
            }
            
            resolve({});
        });
    });
}

async function* loadRoutesInChunks(filename, chunkSize = 100) {
    const ext = path.extname(filename);
	console.log (filename);

    if (ext === '.json') {
        const fileStream = fs.createReadStream(filename);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let buffer = [];
        for await (const line of rl) {
            if (line.trim().length === 0) continue;
            buffer.push(JSON.parse(line));
            if (buffer.length === chunkSize) {
                yield buffer;
                buffer = [];
            }
        }
        if (buffer.length > 0) yield buffer;
        return;
    }
    if (ext === '.br' || filename.includes('.bin.br')) {
        // Verificar que el archivo no esté vacío o corrupto antes de leer
        const stats = fs.statSync(filename);
        if (stats.size === 0) {
            throw new Error(`El archivo ${filename} está vacío. Regenera el archivo .bin.br`);
        }

        const fileStream = fs.createReadStream(filename);
        const brotliStream = zlib.createBrotliDecompress();
        
        fileStream.pipe(brotliStream);

        let pendingBuffer = Buffer.alloc(0);
        let currentChunk = [];

        try {
            for await (const chunk of brotliStream) {
                pendingBuffer = Buffer.concat([pendingBuffer, chunk]);
                let offset = 0;
                
                while (offset + 2 <= pendingBuffer.length) {
                    const routeLength = pendingBuffer.readUInt16LE(offset);
                    const routeSizeBytes = 2 + 4 + (routeLength - 1) * 2;
                    
                    if (offset + routeSizeBytes > pendingBuffer.length) {
                        break; // Esperar más datos
                    }
                    
                    // Decodificar ruta
                    const route = [];
                    let x = pendingBuffer.readInt16LE(offset + 2);
                    let y = pendingBuffer.readInt16LE(offset + 4);
                    route.push([x, y]);
                    
                    let currentOffset = offset + 6;
                    for (let i = 1; i < routeLength; i++) {
                        x += pendingBuffer.readInt8(currentOffset);
                        y += pendingBuffer.readInt8(currentOffset + 1);
                        route.push([x, y]);
                        currentOffset += 2;
                    }
                    
                    currentChunk.push(route);
                    offset += routeSizeBytes;
                    
                    if (currentChunk.length === chunkSize) {
                        yield currentChunk;
                        currentChunk = [];
                    }
                }
                
                if (offset > 0) {
                    pendingBuffer = pendingBuffer.subarray(offset);
                }
            }
            
            if (currentChunk.length > 0) {
                yield currentChunk;
            }
        } catch (err) {
            if (err.code === 'Z_BUF_ERROR' || err.code === 'Z_DATA_ERROR') {
                throw new Error(
                    `El archivo ${filename} está corrupto o incompleto (no es un stream Brotli válido). ` +
                    `Verifica que se haya generado correctamente con la función createRoutes.`
                );
            }
            throw err;
        }
        return;
    }

    throw new Error(`Extensión de archivo no soportada: ${ext}. Usa .json o .bin.br`);
}
// Recupera información de la villa
function getVillageInfo(){
	if(gestHorderData == undefined){
		return undefined;
	}
	const ville = gestHorderData.data.general.ville;
	const sizeX = ville.width;
	const sizeY = ville.height;
	const villX = ville.pos_x;
	const villY = ville.pos_y;
	return {maxX: sizeX - villX - 1 , maxY: sizeY - villY, minX: -villX, minY: -villY + 1, x: villX, y: villY }
}
// Función para generar todas las combinaciones posibles
function generateCombinations(arr) {
  const result = [];
  const n = arr.length;
  for (let i = 1; i < (1 << n); i++) {
    const combo = [];
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) combo.push(arr[j]);
    }
    result.push(combo);
  }
  return result;
}
function searchAvailableObjects(obj, list) {
  const byId = new Map();
  for (const w of list) {
    byId.set(Number(w.id), w);
  }
  const available = [];
  for (const [key, inv] of Object.entries(obj)) {
    const found = byId.get(inv.p);
    if (found) {
      available.push({
        key,
        ...inv,
        ...found
      });
    }
  }
  return available;
}
// Función para encontrar la combinación más cercana al objetivo totalKills sin materializar 2^n arreglos
function findClosestWeaponsCombination(list, totalKills, inv) {
  const available = searchAvailableObjects(inv, list);
  const n = Math.min(available.length, 20);
  if (n === 0) return null;

  let bestMask = 0;
  let bestAverage = 0;
  let differenceMin = Infinity;
  const totalMasks = 1 << n;

  for (let mask = 1; mask < totalMasks; mask++) {
    let sumChance = 0;
    let sumKills = 0;
    let count = 0;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) {
        const o = available[j];
        sumChance += (o.chance_kill / 100);
        sumKills += ((o.kill_min + o.kill_max) / 2);
        count++;
      }
    }
    const chanceKill = sumChance / count;
    const averageRounded = Math.floor(sumKills) * chanceKill;
    const difference = Math.abs(averageRounded - totalKills);

    if (difference < differenceMin ||
       (difference === differenceMin && averageRounded <= totalKills)) {
      differenceMin = difference;
      bestMask = mask;
      bestAverage = averageRounded;
    }
  }

  if (bestMask === 0) return null;
  const combo = [];
  for (let j = 0; j < n; j++) {
    if (bestMask & (1 << j)) combo.push(available[j]);
  }
  return { combo, average: bestAverage };
}
function logTrace(url, method, body = undefined, status = undefined, result = undefined) {
	if(dataSaved.log == undefined){
		dataSaved.log = {};
	}
	const urlsInvalidLog = ["/jx/beyond/partial/desert/actions", "/jx/beyond/desert/cached"];
	if(method != 'GET' && status >= 200 && status <= 206 && !urlsInvalidLog.includes(url)){
		const currentDate = getFormattedDate();
		dataSaved.log[currentDate] = {
			request: {
				url: url,
				method: method,
				body: body
			}
			//,status: status
			/*
			response: {
				status: status,
				body: result
			}
			*/
		};
		console.log(dataSaved.log[currentDate]);
		
		takeScreenshot(`./debug/${currentDate}.png`);
	}
	//console.log(dataSaved.log[currentDate]);
	//writeJSON(nameFile_dataSaved, dataSaved);
}

function getFormattedDate() {
	const d = new Date();
	
	const yyyy = d.getFullYear();
	const mm = (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1);
	const dd = (d.getDate() < 10 ? '0' : '') + d.getDate();
	
	const hh = (d.getHours() < 10 ? '0' : '') + d.getHours();
	const ii = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
	const ss = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
	const millis = (d.getMilliseconds() < 100 ? (d.getMilliseconds() < 10 ? '00' : '0') : '') + d.getMilliseconds();
	
	return `${yyyy}${mm}${dd}_${hh}${ii}${ss}_${millis}`;
}

async function getCurrentCountCitizens() {
	try{
		let count = parseInt((await doAction("/jx/town/citizens", "GET", {})).match(
		  /<span[^>]*class="[^"]*citizen_count[^"]*"[^>]*>(.*?)<\/span>/is
		)?.[1]?.match(/\d+/)?.[0] || '0',10);
		if(count == 0){
			gestHorderData = await getGestHordes();
			if(gestHorderData?.data?.general?.ville?.map_id == lastDataSaved?.idTown) {
				let citoyens = gestHorderData?.data?.carte?.citoyens;
				count = citoyens?.citoyens_dehors?.length + citoyens?.citoyens_ville?.length;
			}
		}
		console.log("citoyens:" + count);
		return count;
	} catch (e){
		return undefined;
	}
}
function parseJsonObject(value) {
    const parsed =
        typeof value === 'string'
            ? JSON.parse(value)
            : value;

    if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
    ) {
        throw new Error('La respuesta no es un objeto JSON');
    }

    return parsed;
}

async function sendTelegramMessage(message) {
  // Crea un contexto HTTP independiente de Playwright
  const apiContext = await request.newContext();
  try {
    const response = await apiContext.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        data: {
          chat_id: chatId,
          text: message,
        },
      }
    );
    const body = await response.json();
    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}: ${body.description || response.statusText()}`);
    }
    console.log('Mensaje enviado con éxito:', body);
    return body;
  } catch (error) {
    console.error('⚠️ Error enviando mensaje a Telegram:', error.message);
    //throw error;
  } finally {
    await apiContext.dispose();
  }
}
function setPlayerInv(playInvTemp){
	if(lastDataSaved.invSize != undefined && lastDataSaved.invSize != 5){
		return;
	}else{
		if(playInvTemp?.target?.size){
			lastDataSaved.invSize = playInvTemp.target.size;
		}else{
			if(!Number.isNaN(Number(playInvTemp))){
				lastDataSaved.invSize = playInvTemp;
			}else{
				lastDataSaved.invSize = 5;
			}
		}
	}
}
async function takeSurvivalFood(currentSaved, inv){
    inv ??= await getInventoryIds();
	const dropRes = await dropPlayerInventory(inv);
	let deseInv = dropRes?.target ? await getListItems(dropRes.target) : await getDesertInventory(inv);
	let tFood = searchItemIdInv([currentSaved.startItems.idFood], deseInv);
	let tWater = searchItemIdInv([currentSaved.startItems.idWater], deseInv);
	if(currentSaved.startItems.idInvFood != undefined && tFood != undefined){
		await moveItem(inv.IdInvDes, inv.IdInvPer, tFood);
		currentSaved.startItems.idInvFood = tFood;
	}
	if(currentSaved.startItems.idInvWater != undefined && tWater != undefined){
		await moveItem(inv.IdInvDes, inv.IdInvPer, tWater);
		currentSaved.startItems.idInvWater = tWater;
	}
}

async function getCurrentCoodinates(){
    const text = await pag.locator('.current-location').textContent();
    if (!text) {
        return undefined;
    }
	//console.log(".current-location: " + text);
    const match = text.match(/(-?\d+)\s*\/\s*(-?\d+)/);
    if (!match) {
        return undefined;
    }
    const x = Number(match[1]);
    const y = Number(match[2]);
	return {x, y}
}

async function tryFixCurrentCoordinates(currentSaved) {
    const currentCoodinates = await getCurrentCoodinates();
	if(currentCoodinates === undefined){
		return;
	}
    const x = currentCoodinates.x;
    const y = currentCoodinates.y;
    for (let i = 0; i < currentSaved.route.way.length; i++) {
        const step = currentSaved.route.way[i];
        if (
            step.x === x &&
            step.y === y &&
            Math.abs(i - currentSaved.route.currentPoss) <= 2
        ) {
            currentSaved.route.currentPoss = i;
            return;
        }
    }
}
function getBuildingsWithDifferentA(data) {
    return data.buildings
        .filter(building => {
            const [x, y] = building.a;
            building.pa = y - x - 1;

            return x > 0 &&
                   x !== y &&
                   !building.t &&
                   building.pa >= 1;
        })
        .sort((a, b) => a.pa - b.pa);
}
async function goBuild(currentPAs){
	if(currentPAs > 0){
		const buildings = getBuildingsWithDifferentA(await doAction("/rest/v1/game/town/core/building/list?completed=1", "GET", {}));
		for (const building of buildings) {
			let action;
			if(building.pa < currentPAs){
				action = await doAction(`/rest/v1/game/town/core/building${building.i}`, "PATCH", { "ap": building.pa});
			}else{
				action = await doAction(`/rest/v1/game/town/core/building${building.i}`, "PATCH", { "ap": currentPAs});
			}
			if(action.error){
				continue;
			}else{
				if(building.pa < currentPAs){
					currentPAs = currentPAs - building.pa;
					if(currentPAs > 0){
						continue;
					}else{
						break;
					}
				}else{
					break;
				}
			}
		}
	}
}
async function asegurarCheckedLi(selector, { timeout = 7000 } = {}) {
  const li = pag.locator(selector).first();
  await li.waitFor({ state: 'visible', timeout });

  const leerEstado = () => li.evaluate(el => {
    // 1) ¿hay un input real dentro?
    const input = el.querySelector('input[type="checkbox"], input[type="radio"]');
    if (input) return input.checked;
    // 2) ¿estado por ARIA (en el li o en un hijo)?
    const aria = el.getAttribute('aria-checked')
      ?? el.querySelector('[aria-checked]')?.getAttribute('aria-checked');
    if (aria != null) return aria === 'true';
    // 3) ¿estado por clase CSS?
    return ['checked', 'is-checked', 'active', 'selected', 'complete', 'completed']
      .some(c => el.classList.contains(c));
  });

  if (await leerEstado()) return true; // ya estaba check → no se toca ✔

  await li.click(); // estaba descheck → marcar

  // Esperar a que el estado cambie de verdad (la UI puede tardar)
  const inicio = Date.now();
  while (!(await leerEstado())) {
    if (Date.now() - inicio > timeout) {
      throw new Error(`El li no quedó marcado tras el clic: ${selector}`);
    }
    await pag.waitForTimeout(100);
  }
  return true;
}

async function updateGestHordesPromise() {
	
	browsergest = await chromium.launch({
		channel: 'msedge',
		headless: true
	});

	const context = await browsergest.newContext();
	
	const page = await context.newPage();

	try {
		lastDataSaved = readJSON(nameFile_lastDataSaved);
		const idTown = lastDataSaved.idTown;
		
		let response;
		const maxIntentos = 2;
		for (let intento = 1; intento <= maxIntentos; intento++) {
			try {
				const ghCookies = await page.context().cookies('https://gesthordes.fr');
				console.log(`GestHordes intento ${intento} | URL:`, page.url(), '| Cookies:', ghCookies.map(c => c.name));

				if (intento === 1) {
					if (!page.url().startsWith('https://gesthordes.fr/')) {
						await page.goto('https://gesthordes.fr/news', { waitUntil: 'domcontentloaded', timeout: 30000 });
					}
					response = await page.evaluate(async (idTown) => {
						const res = await fetch(`https://gesthordes.fr/rest/v1/carte/${idTown}`, {
							method: 'GET',
							credentials: 'include',
							signal: AbortSignal.timeout(15000),
							headers: {
								accept: 'application/json',
								'gh-mapid': String(parseInt(idTown, 10))
							}
						});
						const contentType = res.headers.get('content-type') || '';
						if (!res.ok) {
							const body = await res.text();
							throw new Error(`HTTP ${res.status} (${contentType}) - ${body.slice(0, 200)}`);
						}
						if (!contentType.includes('application/json')) {
							const body = await res.text();
							throw new Error(`Respuesta no JSON (${contentType}) - ${body.slice(0, 200)}`);
						}
						return await res.json();
					}, idTown);
				} else {
					const [intercepted] = await Promise.all([
						page.waitForResponse(
							res => res.url().includes(`/rest/v1/carte/${idTown}`) && res.request().method() === 'GET',
							{ timeout: 20000 }
						),
						page.goto(`https://gesthordes.fr/carte/${idTown}`, {
							waitUntil: 'domcontentloaded',
							timeout: 30000
						})
					]);
					const contentType = intercepted.headers()['content-type'] || '';
					if (!intercepted.ok()) {
						const body = await intercepted.text().catch(() => '');
						throw new Error(`Interceptado HTTP ${intercepted.status()} (${contentType}) - ${body.slice(0, 200)}`);
					}
					response = await intercepted.json();
				}
				
				break; // Salimos del bucle si tuvo éxito
			} catch (error) {
				console.error(`GestHordes intento ${intento}/${maxIntentos} falló:`, error.message);
				if (intento === maxIntentos) {
					throw new Error(`Se agotaron los ${maxIntentos} intentos para ${idTown}. Último error: ${error.message}`);
				}
				// Espera exponencial antes del siguiente intento
				await new Promise(resolve => setTimeout(resolve, 1000 * intento));
			}
		}
		
		// 💡 CONSEJO: Usa coma (,) en lugar de concatenación (+) para ver el objeto completo en consola
		console.log("GestHordes:", response);
		
		writeJSON('data/gestHordes.json', response);
		
	} catch(exception) {
		console.log("No se logró actualizar GestHordes, " + exception.message);
	} finally {
		// Es recomendable cerrar el navegador para evitar fugas de memoria en ejecuciones repetidas
		await browsergest.close();
	}
}
async function sendDebugPhoto(nav){
	console.log("Enviando Foto");
	await nav.screenshot({
		path: 'debug.png',
		fullPage: true
	});

	const form = new FormData();
	
	form.append(
		'photo',
		new Blob([fs.readFileSync('debug.png')]),
		'debug.png'
	);
	
	await fetch(
		`https://api.telegram.org/bot${botToken}/sendPhoto?chat_id=${chatId}`,
		{
			method: 'POST',
			body: form
		}
	);
	console.log("Foto enviada");
}
async function sendGif(path) {

    const form = new FormData();

    form.append(
        'animation',
        new Blob([fs.readFileSync(path)]),
        'history.gif'
    );

    await fetch(
        `https://api.telegram.org/bot${botToken}/sendAnimation?chat_id=${chatId}`,
        {
            method: 'POST',
            body: form
        }
    );
}
function takeScreenshot(file) {
    if (!fs.existsSync('./debug')) {
        fs.mkdirSync('./debug', { recursive: true });
    }
    if (deferGitPush) {
        gitNeedsFullStage = true;
    }
    if (screenshotInFlight) {
        queuedScreenshotFile = file;
        return;
    }
    screenshotInFlight = true;
    const captureNext = (targetFile) => {
        return pag.screenshot({
            path: targetFile,
            fullPage: true,
            animations: 'disabled'
        })
        .then(() => {
            if (!deferGitPush) {
                retryPush(targetFile, 4);
            } else {
                pendingGitPaths.add(targetFile);
            }
        })
        .catch((error) => {
            console.error(`Error al tomar screenshot de ${targetFile}:`, error.message || error);
        })
        .then(() => {
            if (queuedScreenshotFile !== null) {
                const next = queuedScreenshotFile;
                queuedScreenshotFile = null;
                return captureNext(next);
            }
            screenshotInFlight = false;
        });
    };
    screenshotPromise = screenshotPromise.then(() => captureNext(file));
}
// Genera un GIF animado con todos los PNG de una carpeta (reemplaza ImageMagick)
async function createGifFromPngs(inputDir, outputFile, delayMs = 2500) {
	const { createCanvas, loadImage } = require('canvas');
	const GIFEncoder = require('gif-encoder-2');
	const files = fs.readdirSync(inputDir)
		.filter(f => f.toLowerCase().endsWith('.png'))
		.sort(); // tus nombres son timestamps (yyyymmdd_hhmmss_millis) => orden cronológico

	if (files.length === 0) {
		throw new Error(`No hay PNGs en ${inputDir}`);
	}

	// Cargar imágenes y calcular el tamaño máximo:
	// tus screenshots son fullPage, así que la altura varía entre capturas
	const images = [];
	let width = 0;
	let height = 0;
	for (const f of files) {
		const img = await loadImage(path.join(inputDir, f));
		images.push(img);
		width = Math.max(width, img.width);
		height = Math.max(height, img.height);
	}

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	const encoder = new GIFEncoder(width, height, 'neuquant', true);
	encoder.setDelay(delayMs); // milisegundos por frame
	encoder.setRepeat(0);      // loop infinito (equivale a -loop 0)
	encoder.setQuality(10);    // solo aplica a neuquant: 1 = mejor calidad y más lento
	encoder.start();

	for (const img of images) {
		ctx.fillStyle = '#000'; // relleno para frames más pequeños que el canvas
		ctx.fillRect(0, 0, width, height);
		ctx.drawImage(img, 0, 0);
		// si prefieres estirar cada captura al tamaño del canvas:
		// ctx.drawImage(img, 0, 0, width, height);
		encoder.addFrame(ctx);
	}

	encoder.finish();
	fs.writeFileSync(outputFile, encoder.out.getData());
	return outputFile;
}
