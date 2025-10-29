import { connect } from 'cloudflare:sockets';

let authToken = '351c9981-04b6-4103-aa4b-864aa9c91469';
let fallbackAddress = '';
let fallbackPort = '443';
let socks5Config = '';
let customPreferredIPs = [];
let customPreferredDomains = [];
let enableSocksDowngrade = false;
let disableNonTLS = false;
let disablePreferred = false;

let enableRegionMatching = true;
let currentWorkerRegion = '';
let manualWorkerRegion = '';
let preferredIPsURL = '';

// KV瀛樺偍鐩稿叧鍙橀噺
let kvStore = null;
let kvConfig = {};

const regionMapping = {
    'US': ['🇺🇸 美国', 'US', 'United States'],
    'SG': ['🇸🇬 新加坡', 'SG', 'Singapore'],
    'JP': ['🇯🇵 日本', 'JP', 'Japan'],
    'HK': ['🇭🇰 香港', 'HK', 'Hong Kong'],
    'KR': ['🇰🇷 韩国', 'KR', 'South Korea'],
    'DE': ['🇩🇪 德国', 'DE', 'Germany'],
    'SE': ['🇸🇪 瑞典', 'SE', 'Sweden'],
    'NL': ['🇳🇱 荷兰', 'NL', 'Netherlands'],
    'FI': ['🇫🇮 芬兰', 'FI', 'Finland'],
    'GB': ['🇬🇧 英国', 'GB', 'United Kingdom'],
    'Oracle': ['甲骨文', 'Oracle'],
    'DigitalOcean': ['数字海', 'DigitalOcean'],
    'Vultr': ['Vultr', 'Vultr'],
    'Multacom': ['Multacom', 'Multacom']
};

let backupIPs = [
    { domain: 'ProxyIP.US.CMLiussss.net', region: 'US', regionCode: 'US', port: 443 },
    { domain: 'ProxyIP.SG.CMLiussss.net', region: 'SG', regionCode: 'SG', port: 443 },
    { domain: 'ProxyIP.JP.CMLiussss.net', region: 'JP', regionCode: 'JP', port: 443 },
    { domain: 'ProxyIP.HK.CMLiussss.net', region: 'HK', regionCode: 'HK', port: 443 },
    { domain: 'ProxyIP.KR.CMLiussss.net', region: 'KR', regionCode: 'KR', port: 443 },
    { domain: 'ProxyIP.DE.CMLiussss.net', region: 'DE', regionCode: 'DE', port: 443 },
    { domain: 'ProxyIP.SE.CMLiussss.net', region: 'SE', regionCode: 'SE', port: 443 },
    { domain: 'ProxyIP.NL.CMLiussss.net', region: 'NL', regionCode: 'NL', port: 443 },
    { domain: 'ProxyIP.FI.CMLiussss.net', region: 'FI', regionCode: 'FI', port: 443 },
    { domain: 'ProxyIP.GB.CMLiussss.net', region: 'GB', regionCode: 'GB', port: 443 },
    { domain: 'ProxyIP.Oracle.cmliussss.net', region: 'Oracle', regionCode: 'Oracle', port: 443 },
    { domain: 'ProxyIP.DigitalOcean.CMLiussss.net', region: 'DigitalOcean', regionCode: 'DigitalOcean', port: 443 },
    { domain: 'ProxyIP.Vultr.CMLiussss.net', region: 'Vultr', regionCode: 'Vultr', port: 443 },
    { domain: 'ProxyIP.Multacom.CMLiussss.net', region: 'Multacom', regionCode: 'Multacom', port: 443 }
];

const directDomains = [
    { name: "cloudflare.182682.xyz", domain: "cloudflare.182682.xyz" }, { name: "speed.marisalnc.com", domain: "speed.marisalnc.com" },
    { domain: "freeyx.cloudflare88.eu.org" }, { domain: "bestcf.top" }, { domain: "cdn.2020111.xyz" }, { domain: "cfip.cfcdn.vip" },
    { domain: "cf.0sm.com" }, { domain: "cf.090227.xyz" }, { domain: "cf.zhetengsha.eu.org" }, { domain: "cloudflare.9jy.cc" },
    { domain: "cf.zerone-cdn.pp.ua" }, { domain: "cfip.1323123.xyz" }, { domain: "cnamefuckxxs.yuchen.icu" }, { domain: "cloudflare-ip.mofashi.ltd" },
    { domain: "115155.xyz" }, { domain: "cname.xirancdn.us" }, { domain: "f3058171cad.002404.xyz" }, { domain: "8.889288.xyz" },
    { domain: "cdn.tzpro.xyz" }, { domain: "cf.877771.xyz" }, { domain: "xn--b6gac.eu.org" }
];

const E_INVALID_DATA = atob('aW52YWxpZCBkYXRh');
const E_INVALID_USER = atob('aW52YWxpZCB1c2Vy');
const E_UNSUPPORTED_CMD = atob('Y29tbWFuZCBpcyBub3Qgc3VwcG9ydGVk');
const E_UDP_DNS_ONLY = atob('VURQIHByb3h5IG9ubHkgZW5hYmxlIGZvciBETlMgd2hpY2ggaXMgcG9ydCA1Mw==');
const E_INVALID_ADDR_TYPE = atob('aW52YWxpZCBhZGRyZXNzVHlwZQ==');
const E_EMPTY_ADDR = atob('YWRkcmVzc1ZhbHVlIGlzIGVtcHR5');
const E_WS_NOT_OPEN = atob('d2ViU29ja2V0LmVhZHlTdGF0ZSBpcyBub3Qgb3Blbg==');
const E_INVALID_ID_STR = atob('U3RyaW5naWZpZWQgaWRlbnRpZmllciBpcyBpbnZhbGlk');
const E_INVALID_SOCKS_ADDR = atob('SW52YWxpZCBTT0NLUyBhZGRyZXNzIGZvcm1hdA==');
const E_SOCKS_NO_METHOD = atob('bm8gYWNjZXB0YWJsZSBtZXRob2Rz');
const E_SOCKS_AUTH_NEEDED = atob('c29ja3Mgc2VydmVyIG5lZWRzIGF1dGg=');
const E_SOCKS_AUTH_FAIL = atob('ZmFpbCB0byBhdXRoIHNvY2tzIHNlcnZlcg==');
const E_SOCKS_CONN_FAIL = atob('ZmFpbCB0byBvcGVuIHNvY2tzIGNvbm5lY3Rpb24=');

let parsedSocks5Config = {};
let isSocksEnabled = false;

const ADDRESS_TYPE_IPV4 = 1;
const ADDRESS_TYPE_URL = 2;
const ADDRESS_TYPE_IPV6 = 3;

function isValidFormat(str) {
    const userRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return userRegex.test(str);
}

function isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) return true;
    
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) return true;
    
    const ipv6ShortRegex = /^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    if (ipv6ShortRegex.test(ip)) return true;
    
    return false;
}

// KV瀛樺偍鐩稿叧鍑芥暟
async function initKVStore(env) {
    if (env.C) {
        try {
            kvStore = env.C;
            await loadKVConfig();
        } catch (error) {
            console.error('KV鍒濆鍖栧け璐ワ紝灏嗙鐢↘V鍔熻兘:', error);
            kvStore = null;
        }
    }
}

async function loadKVConfig() {
    if (!kvStore) return;
    
    try {
        const configData = await kvStore.get('c');
        if (configData) {
            kvConfig = JSON.parse(configData);
        }
    } catch (error) {
        console.error('鍔犺浇KV閰嶇疆澶辫触:', error);
        kvConfig = {};
    }
}

async function saveKVConfig() {
    if (!kvStore) return;
    
    try {
        await kvStore.put('c', JSON.stringify(kvConfig));
    } catch (error) {
        console.error('淇濆瓨KV閰嶇疆澶辫触:', error);
    }
}

function getConfigValue(key, defaultValue = '') {
    // 浼樺厛浣跨敤KV閰嶇疆锛岀劧鍚庝娇鐢ㄧ幆澧冨彉閲?    if (kvConfig[key] !== undefined) {
        return kvConfig[key];
    }
    return defaultValue;
}

async function setConfigValue(key, value) {
    kvConfig[key] = value;
    await saveKVConfig();
}

async function detectWorkerRegion(request) {
    try {
        const cfCountry = request.cf?.country;
        
        if (cfCountry) {
            const countryToRegion = {
                'US': 'US', 'SG': 'SG', 'JP': 'JP', 'HK': 'HK', 'KR': 'KR',
                'DE': 'DE', 'SE': 'SE', 'NL': 'NL', 'FI': 'FI', 'GB': 'GB',
                'CN': 'HK', 'TW': 'HK', 'AU': 'SG', 'CA': 'US',
                'FR': 'DE', 'IT': 'DE', 'ES': 'DE', 'CH': 'DE',
                'AT': 'DE', 'BE': 'NL', 'DK': 'SE', 'NO': 'SE', 'IE': 'GB'
            };
            
            if (countryToRegion[cfCountry]) {
                return countryToRegion[cfCountry];
            }
        }
        
        return 'HK';
        
    } catch (error) {
        return 'HK';
    }
}


async function checkIPAvailability(domain, port = 443, timeout = 2000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(`https://${domain}`, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CF-IP-Checker/1.0)'
            }
        });
        
        clearTimeout(timeoutId);
        return response.status < 500;
    } catch (error) {
        return true;
    }
}

async function getBestBackupIP(workerRegion = '') {
    
    if (backupIPs.length === 0) {
        return null;
    }
    
    const availableIPs = backupIPs.map(ip => ({ ...ip, available: true }));
    
    if (enableRegionMatching && workerRegion) {
        const sortedIPs = getSmartRegionSelection(workerRegion, availableIPs);
        if (sortedIPs.length > 0) {
            const selectedIP = sortedIPs[0];
            return selectedIP;
        }
    }
    
    const selectedIP = availableIPs[0];
    return selectedIP;
}

function getNearbyRegions(region) {
    const nearbyMap = {
        'US': ['SG', 'JP', 'HK', 'KR'], // 缇庡浗 -> 浜氬お鍦板尯
        'SG': ['JP', 'HK', 'KR', 'US'], // 鏂板姞鍧?-> 浜氬お鍦板尯
        'JP': ['SG', 'HK', 'KR', 'US'], // 鏃ユ湰 -> 浜氬お鍦板尯
        'HK': ['SG', 'JP', 'KR', 'US'], // 棣欐腐 -> 浜氬お鍦板尯
        'KR': ['JP', 'HK', 'SG', 'US'], // 闊╁浗 -> 浜氬お鍦板尯
        'DE': ['NL', 'GB', 'SE', 'FI'], // 寰峰浗 -> 娆ф床鍦板尯
        'SE': ['DE', 'NL', 'FI', 'GB'], // 鐟炲吀 -> 鍖楁鍦板尯
        'NL': ['DE', 'GB', 'SE', 'FI'], // 鑽峰叞 -> 瑗挎鍦板尯
        'FI': ['SE', 'DE', 'NL', 'GB'], // 鑺叞 -> 鍖楁鍦板尯
        'GB': ['DE', 'NL', 'SE', 'FI']  // 鑻卞浗 -> 瑗挎鍦板尯
    };
    
    return nearbyMap[region] || [];
}

function getAllRegionsByPriority(region) {
    const nearbyRegions = getNearbyRegions(region);
    const allRegions = ['US', 'SG', 'JP', 'HK', 'KR', 'DE', 'SE', 'NL', 'FI', 'GB'];
    
    return [region, ...nearbyRegions, ...allRegions.filter(r => r !== region && !nearbyRegions.includes(r))];
}

function getSmartRegionSelection(workerRegion, availableIPs) {
    
    if (!enableRegionMatching || !workerRegion) {
        return availableIPs;
    }
    
    const priorityRegions = getAllRegionsByPriority(workerRegion);
    
    const sortedIPs = [];
    
    for (const region of priorityRegions) {
        const regionIPs = availableIPs.filter(ip => ip.regionCode === region);
        sortedIPs.push(...regionIPs);
    }
    
    return sortedIPs;
}

function parseAddressAndPort(input) {
    if (input.includes('[') && input.includes(']')) {
        const match = input.match(/^\[([^\]]+)\](?::(\d+))?$/);
        if (match) {
            return {
                address: match[1],
                port: match[2] ? parseInt(match[2], 10) : null
            };
        }
    }
    
    const lastColonIndex = input.lastIndexOf(':');
    if (lastColonIndex > 0) {
        const address = input.substring(0, lastColonIndex);
        const portStr = input.substring(lastColonIndex + 1);
        const port = parseInt(portStr, 10);
        
        if (!isNaN(port) && port > 0 && port <= 65535) {
            return { address, port };
        }
    }
    
    return { address: input, port: null };
}

export default {
	async fetch(request, env, ctx) {
		try {
			// 鍒濆鍖朘V瀛樺偍
			await initKVStore(env);
			
			authToken = (env.u || env.U || authToken).toLowerCase();
			const subPath = (env.d || env.D || authToken).toLowerCase();
			
			const customIP = getConfigValue('p', env.p || env.P);
			let useCustomIP = false;
			
			// 妫€鏌ユ槸鍚︽墜鍔ㄦ寚瀹氫簡wk鍦板尯 (浼樺厛浣跨敤KV閰嶇疆)
			const manualRegion = getConfigValue('wk', env.wk || env.WK);
			if (manualRegion && manualRegion.trim()) {
				manualWorkerRegion = manualRegion.trim().toUpperCase();
				currentWorkerRegion = manualWorkerRegion;
			} else if (customIP && customIP.trim()) {
				useCustomIP = true;
				currentWorkerRegion = 'CUSTOM';
			} else {
				currentWorkerRegion = await detectWorkerRegion(request);
			}
			
			const regionMatchingControl = env.rm || env.RM;
			if (regionMatchingControl && regionMatchingControl.toLowerCase() === 'no') {
				enableRegionMatching = false;
			}
			
			const envFallback = getConfigValue('p', env.p || env.P);
			if (envFallback) {
				const fallbackValue = envFallback.toLowerCase();
				if (fallbackValue.includes(']:')) {
					const lastColonIndex = fallbackValue.lastIndexOf(':');
					fallbackPort = fallbackValue.slice(lastColonIndex + 1);
					fallbackAddress = fallbackValue.slice(0, lastColonIndex);
				} else if (!fallbackValue.includes(']:') && !fallbackValue.includes(']')) {
					[fallbackAddress, fallbackPort = '443'] = fallbackValue.split(':');
				} else {
					fallbackAddress = fallbackValue;
					fallbackPort = '443';
				}
			}

			socks5Config = getConfigValue('s', env.s || env.S) || socks5Config;
			if (socks5Config) {
				try {
					parsedSocks5Config = parseSocksConfig(socks5Config);
					isSocksEnabled = true;
				} catch (err) {
					isSocksEnabled = false;
				}
			}

			// 浼樺厛浣跨敤KV閰嶇疆锛岀劧鍚庝娇鐢ㄧ幆澧冨彉閲?			const customPreferred = getConfigValue('yx', env.yx || env.YX);
			if (customPreferred) {
				try {
					const preferredList = customPreferred.split(',').map(item => item.trim()).filter(item => item);
					customPreferredIPs = [];
					customPreferredDomains = [];
					
					preferredList.forEach(item => {
						// 妫€鏌ユ槸鍚﹀寘鍚妭鐐瑰悕绉?(#)
						let nodeName = '';
						let addressPart = item;
						
						if (item.includes('#')) {
							const parts = item.split('#');
							addressPart = parts[0].trim();
							nodeName = parts[1].trim();
						}
						
						const { address, port } = parseAddressAndPort(addressPart);
						
						// 濡傛灉娌℃湁璁剧疆鑺傜偣鍚嶇О锛屼娇鐢ㄩ粯璁ゆ牸寮?						if (!nodeName) {
							nodeName = '鑷畾涔変紭閫?' + address + (port ? ':' + port : '');
						}
						
						if (isValidIP(address)) {
							customPreferredIPs.push({ 
								ip: address, 
								port: port,
								isp: nodeName
							});
						} else {
							customPreferredDomains.push({ 
								domain: address, 
								port: port,
								name: nodeName
							});
						}
					});
				} catch (err) {
					customPreferredIPs = [];
					customPreferredDomains = [];
				}
			}

			const downgradeControl = env.qj || env.QJ;
			if (downgradeControl && downgradeControl.toLowerCase() === 'no') {
				enableSocksDowngrade = true;
			}

			// 浼樺厛浣跨敤KV閰嶇疆锛岀劧鍚庝娇鐢ㄧ幆澧冨彉閲?			const dkbyControl = getConfigValue('dkby', env.dkby || env.DKBY);
			if (dkbyControl && dkbyControl.toLowerCase() === 'yes') {
				disableNonTLS = true;
			}

			const yxbyControl = env.yxby || env.YXBY;
			if (yxbyControl && yxbyControl.toLowerCase() === 'yes') {
				disablePreferred = true;
			}

			// 浼樺厛浣跨敤KV閰嶇疆锛岀劧鍚庝娇鐢ㄧ幆澧冨彉閲忥紝濡傛灉閮芥病鏈夊垯浣跨敤榛樿URL
			preferredIPsURL = getConfigValue('yxURL', env.yxURL || env.YXURL) || 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
			
			// 濡傛灉yxURL涓嶆槸榛樿鍊硷紝娓呯┖鍩熷悕浣嗕繚鐣檅ackupIPs浣滀负鍚庡閫夐」
			const defaultURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
			if (preferredIPsURL !== defaultURL) {
				directDomains.length = 0;
				customPreferredIPs = [];
				customPreferredDomains = [];
			}

			const url = new URL(request.url);

			if (request.headers.get('Upgrade') === 'websocket') {
				return await handleWsRequest(request);
			}
			
			// 閰嶇疆绠＄悊API璺敱锛堟敮鎸丟ET鍜孭OST锛?			if (url.pathname.includes('/api/config')) {
				const pathParts = url.pathname.split('/').filter(p => p);
				// 鏌ユ壘UUID - 搴旇鍦?api 涔嬪墠
				const apiIndex = pathParts.indexOf('api');
				if (apiIndex > 0) {
					const user = pathParts[apiIndex - 1];
					if (isValidFormat(user) && user === authToken) {
						return await handleConfigAPI(request);
					} else if (isValidFormat(user)) {
						return new Response(JSON.stringify({ error: 'UUID閿欒' }), { 
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				// 濡傛灉璺緞鏍煎紡涓嶆纭紝杩斿洖JSON閿欒
				return new Response(JSON.stringify({ error: '鏃犳晥鐨凙PI璺緞' }), { 
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			// 浼橀€塈P绠＄悊API璺敱
			if (url.pathname.includes('/api/preferred-ips')) {
				const pathParts = url.pathname.split('/').filter(p => p);
				// 鏌ユ壘UUID - 搴旇鍦?api 涔嬪墠
				const apiIndex = pathParts.indexOf('api');
				if (apiIndex > 0) {
					const user = pathParts[apiIndex - 1];
					if (isValidFormat(user) && user === authToken) {
						return await handlePreferredIPsAPI(request);
					} else if (isValidFormat(user)) {
						return new Response(JSON.stringify({ error: 'UUID閿欒' }), { 
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				// 濡傛灉璺緞鏍煎紡涓嶆纭紝杩斿洖JSON閿欒
				return new Response(JSON.stringify({ error: '鏃犳晥鐨凙PI璺緞' }), { 
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			if (request.method === 'GET') {
				if (url.pathname === '/region') {
					// 浼樺厛浣跨敤KV閰嶇疆锛岀劧鍚庝娇鐢ㄧ幆澧冨彉閲?					const customIP = getConfigValue('p', env.p || env.P);
					const manualRegion = getConfigValue('wk', env.wk || env.WK);
					
					if (manualRegion && manualRegion.trim()) {
						return new Response(JSON.stringify({
							region: manualRegion.trim().toUpperCase(),
							detectionMethod: '鎵嬪姩鎸囧畾鍦板尯',
							manualRegion: manualRegion.trim().toUpperCase(),
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					} else if (customIP && customIP.trim()) {
						return new Response(JSON.stringify({
							region: 'CUSTOM',
							detectionMethod: '鑷畾涔塒roxyIP妯″紡',
							customIP: customIP,
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					} else {
						const detectedRegion = await detectWorkerRegion(request);
						return new Response(JSON.stringify({
							region: detectedRegion,
							detectionMethod: 'API妫€娴?,
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				
				if (url.pathname === '/test-api') {
					try {
						const testRegion = await detectWorkerRegion(request);
						return new Response(JSON.stringify({
							detectedRegion: testRegion,
							message: 'API娴嬭瘯瀹屾垚',
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					} catch (error) {
						return new Response(JSON.stringify({
							error: error.message,
							message: 'API娴嬭瘯澶辫触'
						}), {
							status: 500,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				
				
				if (url.pathname === '/') {
					const terminalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>缁堢</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Courier New", monospace;
            background: #000; color: #00ff00; min-height: 100vh;
            overflow-x: hidden; position: relative;
            display: flex; justify-content: center; align-items: center;
        }
        .matrix-bg {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%);
            z-index: -1;
            animation: bg-pulse 8s ease-in-out infinite;
        }
        @keyframes bg-pulse {
            0%, 100% { background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%); }
            50% { background: linear-gradient(45deg, #000 0%, #002200 50%, #000 100%); }
        }
        .matrix-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px);
            animation: matrix-fall 20s linear infinite;
            z-index: -1;
        }
        @keyframes matrix-fall {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
        }
        .matrix-code-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: -1;
            overflow: hidden;
        }
        .matrix-column {
            position: absolute; top: -100%; left: 0;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 14px; line-height: 1.2;
            animation: matrix-drop 15s linear infinite;
            text-shadow: 0 0 5px #00ff00;
        }
        @keyframes matrix-drop {
            0% { top: -100%; opacity: 1; }
            10% { opacity: 1; }
            90% { opacity: 0.3; }
            100% { top: 100vh; opacity: 0; }
        }
        .matrix-column:nth-child(odd) {
            animation-duration: 12s;
            animation-delay: -2s;
        }
        .matrix-column:nth-child(even) {
            animation-duration: 18s;
            animation-delay: -5s;
        }
        .matrix-column:nth-child(3n) {
            animation-duration: 20s;
            animation-delay: -8s;
        }
        .terminal {
            width: 90%; max-width: 800px; height: 500px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ff00;
            border-radius: 8px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1);
            backdrop-filter: blur(10px);
            position: relative; z-index: 1;
            overflow: hidden;
        }
        .terminal-header {
            background: rgba(0, 20, 0, 0.8);
            padding: 10px 15px;
            border-bottom: 1px solid #00ff00;
            display: flex; align-items: center;
        }
        .terminal-buttons {
            display: flex; gap: 8px;
        }
        .terminal-button {
            width: 12px; height: 12px; border-radius: 50%;
            background: #ff5f57; border: none;
        }
        .terminal-button:nth-child(2) { background: #ffbd2e; }
        .terminal-button:nth-child(3) { background: #28ca42; }
        .terminal-title {
            margin-left: 15px; color: #00ff00;
            font-size: 14px; font-weight: bold;
        }
        .terminal-body {
            padding: 20px; height: calc(100% - 50px);
            overflow-y: auto; font-size: 14px;
            line-height: 1.4;
        }
        .terminal-line {
            margin-bottom: 8px; display: flex; align-items: center;
        }
        .terminal-prompt {
            color: #00ff00; margin-right: 10px;
            font-weight: bold;
        }
        .terminal-input {
            background: transparent; border: none; outline: none;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 14px; flex: 1;
            caret-color: #00ff00;
        }
        .terminal-input::placeholder {
            color: #00aa00; opacity: 0.7;
        }
        .terminal-cursor {
            display: inline-block; width: 8px; height: 16px;
            background: #00ff00; animation: blink 1s infinite;
            margin-left: 2px;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        .terminal-output {
            color: #00aa00; margin: 5px 0;
        }
        .terminal-error {
            color: #ff4444; margin: 5px 0;
        }
        .terminal-success {
            color: #44ff44; margin: 5px 0;
        }
        .matrix-text {
            position: fixed; top: 20px; right: 20px;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 0.8rem; opacity: 0.6;
            animation: matrix-flicker 3s infinite;
        }
        @keyframes matrix-flicker {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    <div class="matrix-rain"></div>
    <div class="matrix-code-rain" id="matrixCodeRain"></div>
    <div class="matrix-text">缁堢</div>
    <div class="terminal">
        <div class="terminal-header">
            <div class="terminal-buttons">
                <div class="terminal-button"></div>
                <div class="terminal-button"></div>
                <div class="terminal-button"></div>
            </div>
            <div class="terminal-title">缁堢</div>
        </div>
        <div class="terminal-body" id="terminalBody">
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">鎭枩浣犳潵鍒拌繖</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">璇疯緭鍏ヤ綘U鍙橀噺鐨勫€?/span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">鍛戒护: connect [UUID]</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <input type="text" class="terminal-input" id="uuidInput" placeholder="杈撳叆U鍙橀噺鐨勫唴瀹瑰苟涓斿洖杞?.." autofocus>
                <span class="terminal-cursor"></span>
            </div>
        </div>
    </div>
    <script>
        function createMatrixRain() {
            const matrixContainer = document.getElementById('matrixCodeRain');
            const matrixChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const columns = Math.floor(window.innerWidth / 18);
            
            for (let i = 0; i < columns; i++) {
                const column = document.createElement('div');
                column.className = 'matrix-column';
                column.style.left = (i * 18) + 'px';
                column.style.animationDelay = Math.random() * 15 + 's';
                column.style.animationDuration = (Math.random() * 15 + 8) + 's';
                column.style.fontSize = (Math.random() * 4 + 12) + 'px';
                column.style.opacity = Math.random() * 0.8 + 0.2;
                
                let text = '';
                const charCount = Math.floor(Math.random() * 30 + 20);
                for (let j = 0; j < charCount; j++) {
                    const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                    const brightness = Math.random() > 0.1 ? '#00ff00' : '#00aa00';
                    text += '<span style="color: ' + brightness + ';">' + char + '</span><br>';
                }
                column.innerHTML = text;
                matrixContainer.appendChild(column);
            }
            
            setInterval(function() {
                const columns = matrixContainer.querySelectorAll('.matrix-column');
                columns.forEach(function(column) {
                    if (Math.random() > 0.95) {
                        const chars = column.querySelectorAll('span');
                        if (chars.length > 0) {
                            const randomChar = chars[Math.floor(Math.random() * chars.length)];
                            randomChar.style.color = '#ffffff';
                            setTimeout(function() {
                                randomChar.style.color = '#00ff00';
                            }, 200);
                        }
                    }
                });
            }, 100);
        }
        
        function isValidUUID(uuid) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(uuid);
        }
        
        function addTerminalLine(content, type = 'output') {
            const terminalBody = document.getElementById('terminalBody');
            const line = document.createElement('div');
            line.className = 'terminal-line';
            
            const prompt = document.createElement('span');
            prompt.className = 'terminal-prompt';
            prompt.textContent = 'root:~$';
            
            const output = document.createElement('span');
            output.className = 'terminal-' + type;
            output.textContent = content;
            
            line.appendChild(prompt);
            line.appendChild(output);
            terminalBody.appendChild(line);
            
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
        
        function handleUUIDInput() {
            const input = document.getElementById('uuidInput');
            const uuid = input.value.trim();
            
            if (uuid) {
                addTerminalLine('connect ' + uuid, 'output');
                
                if (isValidUUID(uuid)) {
                    addTerminalLine('姝ｅ湪鍏ヤ镜...', 'output');
                    setTimeout(() => {
                        addTerminalLine('杩炴帴鎴愬姛锛佽繑鍥炵粨鏋?..', 'success');
                        setTimeout(() => {
                            window.location.href = '/' + uuid;
                        }, 1000);
                    }, 500);
                } else {
                    addTerminalLine('閿欒: 鏃犳晥鐨刄UID鏍煎紡', 'error');
                    addTerminalLine('璇烽噸鏂拌緭鍏ユ湁鏁堢殑UUID', 'output');
                }
                
                input.value = '';
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            createMatrixRain();
            
            const input = document.getElementById('uuidInput');
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleUUIDInput();
                }
            });
        });
    </script>
</body>
</html>`;
					return new Response(terminalHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
				}
				if (url.pathname.length > 1 && url.pathname !== '/' && !url.pathname.includes('/sub')) {
					const user = url.pathname.replace(/\/$/, '').substring(1);
					if (isValidFormat(user)) {
						if (user === authToken) {
							return await handleSubscriptionPage(request, user);
						} else {
							return new Response(JSON.stringify({ error: 'UUID閿欒 璇锋敞鎰忓彉閲忓悕绉版槸u涓嶆槸uuid' }), { 
								status: 403,
								headers: { 'Content-Type': 'application/json' }
							});
						}
					}
				}
				if (url.pathname.includes('/sub')) {
					const pathParts = url.pathname.split('/');
					if (pathParts.length === 2 && pathParts[1] === 'sub') {
						const user = pathParts[0].substring(1);
						if (isValidFormat(user)) {
							if (user === authToken) {
								return await handleSubscriptionRequest(request, user, url);
							} else {
								return new Response(JSON.stringify({ error: 'UUID閿欒' }), { 
									status: 403,
									headers: { 'Content-Type': 'application/json' }
								});
							}
						}
					}
				}
				if (url.pathname.toLowerCase().includes(`/${subPath}`)) {
					return await handleSubscriptionRequest(request, authToken);
				}
			}
			return new Response(JSON.stringify({ error: 'Not Found' }), { 
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (err) {
			return new Response(err.toString(), { status: 500 });
		}
	},
};

async function handleSubscriptionRequest(request, user, url = null) {
    if (!url) url = new URL(request.url);
    
    const finalLinks = [];
    const workerDomain = url.hostname;
    const target = url.searchParams.get('target') || 'base64';

    if (currentWorkerRegion === 'CUSTOM') {
        const nativeList = [{ ip: workerDomain, isp: '鍘熺敓鍦板潃' }];
        finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
    } else {
        try {
            const nativeList = [{ ip: workerDomain, isp: '鍘熺敓鍦板潃' }];
            finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
        } catch (error) {
            if (!currentWorkerRegion) {
                currentWorkerRegion = await detectWorkerRegion(request);
            }
            
            const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
            if (bestBackupIP) {
                fallbackAddress = bestBackupIP.domain;
                fallbackPort = bestBackupIP.port.toString();
                const backupList = [{ ip: fallbackAddress, isp: 'ProxyIP-' + currentWorkerRegion }];
                finalLinks.push(...generateLinksFromSource(backupList, user, workerDomain));
            } else {
                const nativeList = [{ ip: workerDomain, isp: '鍘熺敓鍦板潃' }];
                finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
            }
        }
    }

    const hasCustomPreferred = customPreferredIPs.length > 0 || customPreferredDomains.length > 0;
    
    if (disablePreferred) {
    } else if (hasCustomPreferred) {
        // 浣跨敤yx閰嶇疆鐨勪紭閫塈P锛堝寘鍚獳PI娣诲姞鐨勶級
        if (customPreferredIPs.length > 0) {
            finalLinks.push(...generateLinksFromSource(customPreferredIPs, user, workerDomain));
        }
        
        if (customPreferredDomains.length > 0) {
            const customDomainList = customPreferredDomains.map(d => ({ ip: d.domain, isp: d.name || d.domain }));
            finalLinks.push(...generateLinksFromSource(customDomainList, user, workerDomain));
        }
    } else {
        const domainList = directDomains.map(d => ({ ip: d.domain, isp: d.name || d.domain }));
        finalLinks.push(...generateLinksFromSource(domainList, user, workerDomain));

        const defaultURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
        if (preferredIPsURL === defaultURL) {
            try {
                const dynamicIPList = await fetchDynamicIPs();
                if (dynamicIPList.length > 0) {
                    finalLinks.push(...generateLinksFromSource(dynamicIPList, user, workerDomain));
                }
            } catch (error) {
                if (!currentWorkerRegion) {
                    currentWorkerRegion = await detectWorkerRegion(request);
                }
                
                const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
                if (bestBackupIP) {
                    fallbackAddress = bestBackupIP.domain;
                    fallbackPort = bestBackupIP.port.toString();
                    
                    const backupList = [{ ip: fallbackAddress, isp: 'ProxyIP-' + currentWorkerRegion }];
                    finalLinks.push(...generateLinksFromSource(backupList, user, workerDomain));
                }
            }
        }

        try {
            const newIPList = await fetchAndParseNewIPs();
            if (newIPList.length > 0) {
                finalLinks.push(...generateLinksFromNewIPs(newIPList, user, workerDomain));
            }
        } catch (error) {
            if (!currentWorkerRegion) {
                currentWorkerRegion = await detectWorkerRegion(request);
            }
            
            const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
            if (bestBackupIP) {
                fallbackAddress = bestBackupIP.domain;
                fallbackPort = bestBackupIP.port.toString();
                
                const backupList = [{ ip: fallbackAddress, isp: 'ProxyIP-' + currentWorkerRegion }];
                finalLinks.push(...generateLinksFromSource(backupList, user, workerDomain));
            }
        }
    }

    if (finalLinks.length === 0) {
        const errorRemark = "鎵€鏈夎妭鐐硅幏鍙栧け璐?;
        const proto = atob('dmxlc3M=');
        const errorLink = `${proto}://00000000-0000-0000-0000-000000000000@127.0.0.1:80?encryption=none&security=none&type=ws&host=error.com&path=%2F#${encodeURIComponent(errorRemark)}`;
        finalLinks.push(errorLink);
    }

    let subscriptionContent;
    let contentType = 'text/plain; charset=utf-8';
    
    switch (target.toLowerCase()) {
        case atob('Y2xhc2g='):
        case atob('Y2xhc2hy'):
            subscriptionContent = await generateClashConfig(finalLinks);
            contentType = 'text/yaml; charset=utf-8';
            break;
        case atob('c3VyZ2Uy'):
        case atob('c3VyZ2Uz'):
        case atob('c3VyZ2U0'):
            subscriptionContent = generateSurgeConfig(finalLinks);
            break;
        case atob('cXVhbnR1bXVsdA=='):
        case atob('cXVhbnR1bXVsdHg='):
            subscriptionContent = generateQuantumultConfig(finalLinks);
            break;
        case atob('c3M='):
        case atob('c3Ny'):
            subscriptionContent = generateSSConfig(finalLinks);
            break;
        case atob('djJyYXk='):
            subscriptionContent = generateV2RayConfig(finalLinks);
            break;
        case atob('bG9vbg=='):
            subscriptionContent = generateLoonConfig(finalLinks);
            break;
        default:
            subscriptionContent = btoa(finalLinks.join('\n'));
    }
    
    return new Response(subscriptionContent, {
        headers: { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
    });
}

function generateLinksFromSource(list, user, workerDomain) {
    // Cloudflare鏀寔鐨勭鍙?    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    
    const defaultHttpsPorts = [443];
    const defaultHttpPorts = disableNonTLS ? [] : [80];
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = atob('dmxlc3M=');

    list.forEach(item => {
        const nodeNameBase = item.isp.replace(/\s/g, '_');
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;
        
        let portsToGenerate = [];
        
        if (item.port) {
            // 鏈夋寚瀹氱鍙ｆ椂锛屾牴鎹鍙ｇ被鍨嬪喅瀹氱敓鎴怲LS鎴栭潪TLS
            const port = item.port;
            
            if (CF_HTTPS_PORTS.includes(port)) {
                // CF HTTPS绔彛锛屽彧鐢熸垚TLS鑺傜偣
                portsToGenerate.push({ port: port, tls: true });
            } else if (CF_HTTP_PORTS.includes(port)) {
                // CF HTTP绔彛锛屽彧鐢熸垚闈濼LS鑺傜偣锛堥櫎闈炲惎鐢ㄤ簡disableNonTLS锛?                if (!disableNonTLS) {
                    portsToGenerate.push({ port: port, tls: false });
                }
            } else {
                // 闈濩F鏍囧噯绔彛锛屽彧鐢熸垚TLS鑺傜偣锛圚TTP浼氳CF鎷︽埅锛?                portsToGenerate.push({ port: port, tls: true });
            }
        } else {
            // 娌℃湁鎸囧畾绔彛鏃讹紝浣跨敤榛樿绔彛
            defaultHttpsPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: true });
            });
            defaultHttpPorts.forEach(port => {
                portsToGenerate.push({ port: port, tls: false });
            });
        }

        // 鐢熸垚鑺傜偣
        portsToGenerate.forEach(({ port, tls }) => {
            if (tls) {
                // TLS鑺傜偣
                const wsNodeName = `${nodeNameBase}-${port}-WS-TLS`;
                const wsParams = new URLSearchParams({ 
                    encryption: 'none', 
                    security: 'tls', 
                    sni: workerDomain, 
                    fp: 'chrome', 
                    type: 'ws', 
                    host: workerDomain, 
                    path: wsPath 
                });
                links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            } else {
                // 闈濼LS鑺傜偣
                const wsNodeName = `${nodeNameBase}-${port}-WS`;
                const wsParams = new URLSearchParams({
                    encryption: 'none',
                    security: 'none',
                    type: 'ws',
                    host: workerDomain,
                    path: wsPath
                });
                links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
            }
        });
    });
    return links;
}

async function fetchDynamicIPs() {
    const v4Url1 = "https://www.wetest.vip/page/cloudflare/address_v4.html";
    const v6Url1 = "https://www.wetest.vip/page/cloudflare/address_v6.html";
    let results = [];

    try {
        const [ipv4List, ipv6List] = await Promise.all([
            fetchAndParseWetest(v4Url1),
            fetchAndParseWetest(v6Url1)
        ]);
        results = [...ipv4List, ...ipv6List];
        if (results.length > 0) {
            return results;
        }
    } catch (e) {
        console.error("Failed to fetch from wetest.vip:", e);
    }

            return [];
        }


async function fetchAndParseWetest(url) {
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) {
            console.error(`Failed to fetch ${url}, status: ${response.status}`);
            return [];
        }
        const html = await response.text();
        const results = [];
        const rowRegex = /<tr[\s\S]*?<\/tr>/g;
        const cellRegex = /<td data-label="绾胯矾鍚嶇О">(.+?)<\/td>[\s\S]*?<td data-label="浼橀€夊湴鍧€">([\d.:a-fA-F]+)<\/td>/;

        let match;
        while ((match = rowRegex.exec(html)) !== null) {
            const rowHtml = match[0];
            const cellMatch = rowHtml.match(cellRegex);
            if (cellMatch && cellMatch[1] && cellMatch[2]) {
                results.push({
                    isp: cellMatch[1].trim().replace(/<.*?>/g, ''),
                    ip: cellMatch[2].trim()
                });
            }
        }
        
        if (results.length === 0) {
            console.warn(`Warning: Could not parse any IPs from ${url}. The site structure might have changed.`);
        }

        return results;
    } catch (error) {
        console.error(`Error parsing ${url}:`, error);
        return [];
    }
}

async function handleWsRequest(request) {
    const wsPair = new WebSocketPair();
    const [clientSock, serverSock] = Object.values(wsPair);
    serverSock.accept();

    let remoteConnWrapper = { socket: null };
    let isDnsQuery = false;

    const earlyData = request.headers.get('sec-websocket-protocol') || '';
    const readable = makeReadableStream(serverSock, earlyData);

    readable.pipeTo(new WritableStream({
        async write(chunk) {
            if (isDnsQuery) return await forwardUDP(chunk, serverSock, null);
            if (remoteConnWrapper.socket) {
                const writer = remoteConnWrapper.socket.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }
            const { hasError, message, addressType, port, hostname, rawIndex, version, isUDP } = parseWsPacketHeader(chunk, authToken);
            if (hasError) throw new Error(message);
            if (isUDP) {
                if (port === 53) isDnsQuery = true;
                else throw new Error(E_UDP_DNS_ONLY);
            }
            const respHeader = new Uint8Array([version[0], 0]);
            const rawData = chunk.slice(rawIndex);
            if (isDnsQuery) return forwardUDP(rawData, serverSock, respHeader);
            await forwardTCP(addressType, hostname, port, rawData, serverSock, respHeader, remoteConnWrapper);
        },
    })).catch((err) => { });

    return new Response(null, { status: 101, webSocket: clientSock });
}

async function forwardTCP(addrType, host, portNum, rawData, ws, respHeader, remoteConnWrapper) {
    async function connectAndSend(address, port, useSocks = false) {
        const remoteSock = useSocks ?
            await establishSocksConnection(addrType, address, port) :
            connect({ hostname: address, port: port });
        const writer = remoteSock.writable.getWriter();
        await writer.write(rawData);
        writer.releaseLock();
        return remoteSock;
    }
    
    async function retryConnection() {
        if (enableSocksDowngrade && isSocksEnabled) {
            try {
                const socksSocket = await connectAndSend(host, portNum, true);
                remoteConnWrapper.socket = socksSocket;
                socksSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
                connectStreams(socksSocket, ws, respHeader, null);
                return;
            } catch (socksErr) {
                let backupHost, backupPort;
                if (fallbackAddress && fallbackPort) {
                    backupHost = fallbackAddress;
                    backupPort = parseInt(fallbackPort, 10) || portNum;
                } else {
                    const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
                    backupHost = bestBackupIP ? bestBackupIP.domain : host;
                    backupPort = bestBackupIP ? bestBackupIP.port : portNum;
                }
                
                try {
                    const fallbackSocket = await connectAndSend(backupHost, backupPort, false);
                    remoteConnWrapper.socket = fallbackSocket;
                    fallbackSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
                    connectStreams(fallbackSocket, ws, respHeader, null);
                } catch (fallbackErr) {
                    closeSocketQuietly(ws);
                }
            }
        } else {
            let backupHost, backupPort;
            if (fallbackAddress && fallbackPort) {
                backupHost = fallbackAddress;
                backupPort = parseInt(fallbackPort, 10) || portNum;
            } else {
                const bestBackupIP = await getBestBackupIP(currentWorkerRegion);
                backupHost = bestBackupIP ? bestBackupIP.domain : host;
                backupPort = bestBackupIP ? bestBackupIP.port : portNum;
            }
            
            try {
                const fallbackSocket = await connectAndSend(backupHost, backupPort, isSocksEnabled);
                remoteConnWrapper.socket = fallbackSocket;
                fallbackSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
                connectStreams(fallbackSocket, ws, respHeader, null);
            } catch (fallbackErr) {
                closeSocketQuietly(ws);
            }
        }
    }
    
    try {
        const initialSocket = await connectAndSend(host, portNum, enableSocksDowngrade ? false : isSocksEnabled);
        remoteConnWrapper.socket = initialSocket;
        connectStreams(initialSocket, ws, respHeader, retryConnection);
    } catch (err) {
        retryConnection();
    }
}

function parseWsPacketHeader(chunk, token) {
	if (chunk.byteLength < 24) return { hasError: true, message: E_INVALID_DATA };
	const version = new Uint8Array(chunk.slice(0, 1));
	if (formatIdentifier(new Uint8Array(chunk.slice(1, 17))) !== token) return { hasError: true, message: E_INVALID_USER };
	const optLen = new Uint8Array(chunk.slice(17, 18))[0];
	const cmd = new Uint8Array(chunk.slice(18 + optLen, 19 + optLen))[0];
	let isUDP = false;
	if (cmd === 1) {} else if (cmd === 2) { isUDP = true; } else { return { hasError: true, message: E_UNSUPPORTED_CMD }; }
	const portIdx = 19 + optLen;
	const port = new DataView(chunk.slice(portIdx, portIdx + 2)).getUint16(0);
	let addrIdx = portIdx + 2, addrLen = 0, addrValIdx = addrIdx + 1, hostname = '';
	const addressType = new Uint8Array(chunk.slice(addrIdx, addrValIdx))[0];
	switch (addressType) {
		case ADDRESS_TYPE_IPV4: addrLen = 4; hostname = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + addrLen)).join('.'); break;
		case ADDRESS_TYPE_URL: addrLen = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + 1))[0]; addrValIdx += 1; hostname = new TextDecoder().decode(chunk.slice(addrValIdx, addrValIdx + addrLen)); break;
		case ADDRESS_TYPE_IPV6: addrLen = 16; const ipv6 = []; const ipv6View = new DataView(chunk.slice(addrValIdx, addrValIdx + addrLen)); for (let i = 0; i < 8; i++) ipv6.push(ipv6View.getUint16(i * 2).toString(16)); hostname = ipv6.join(':'); break;
		default: return { hasError: true, message: `${E_INVALID_ADDR_TYPE}: ${addressType}` };
	}
	if (!hostname) return { hasError: true, message: `${E_EMPTY_ADDR}: ${addressType}` };
	return { hasError: false, addressType, port, hostname, isUDP, rawIndex: addrValIdx + addrLen, version };
}

function makeReadableStream(socket, earlyDataHeader) {
	let cancelled = false;
	return new ReadableStream({
		start(controller) {
			socket.addEventListener('message', (event) => { if (!cancelled) controller.enqueue(event.data); });
			socket.addEventListener('close', () => { if (!cancelled) { closeSocketQuietly(socket); controller.close(); } });
			socket.addEventListener('error', (err) => controller.error(err));
			const { earlyData, error } = base64ToArray(earlyDataHeader);
			if (error) controller.error(error); else if (earlyData) controller.enqueue(earlyData);
		},
		cancel() { cancelled = true; closeSocketQuietly(socket); }
	});
}

async function connectStreams(remoteSocket, webSocket, headerData, retryFunc) {
	let header = headerData, hasData = false;
	await remoteSocket.readable.pipeTo(
		new WritableStream({
			async write(chunk, controller) {
				hasData = true;
				if (webSocket.readyState !== 1) controller.error(E_WS_NOT_OPEN);
				if (header) { webSocket.send(await new Blob([header, chunk]).arrayBuffer()); header = null; } 
                else { webSocket.send(chunk); }
			},
			abort(reason) { console.error("Readable aborted:", reason); },
		})
	).catch((error) => { console.error("Stream connection error:", error); closeSocketQuietly(webSocket); });
	if (!hasData && retryFunc) retryFunc();
}

async function forwardUDP(udpChunk, webSocket, respHeader) {
	try {
		const tcpSocket = connect({ hostname: '8.8.4.4', port: 53 });
		let header = respHeader;
		const writer = tcpSocket.writable.getWriter();
		await writer.write(udpChunk);
		writer.releaseLock();
		await tcpSocket.readable.pipeTo(new WritableStream({
			async write(chunk) {
				if (webSocket.readyState === 1) {
					if (header) { webSocket.send(await new Blob([header, chunk]).arrayBuffer()); header = null; } 
                    else { webSocket.send(chunk); }
				}
			},
		}));
	} catch (error) { console.error(`DNS forward error: ${error.message}`); }
}

async function establishSocksConnection(addrType, address, port) {
	const { username, password, hostname, socksPort } = parsedSocks5Config;
	const socket = connect({ hostname, port: socksPort });
	const writer = socket.writable.getWriter();
	await writer.write(new Uint8Array(username ? [5, 2, 0, 2] : [5, 1, 0]));
	const reader = socket.readable.getReader();
	let res = (await reader.read()).value;
	if (res[0] !== 5 || res[1] === 255) throw new Error(E_SOCKS_NO_METHOD);
	if (res[1] === 2) {
		if (!username || !password) throw new Error(E_SOCKS_AUTH_NEEDED);
		const encoder = new TextEncoder();
		const authRequest = new Uint8Array([1, username.length, ...encoder.encode(username), password.length, ...encoder.encode(password)]);
		await writer.write(authRequest);
		res = (await reader.read()).value;
		if (res[0] !== 1 || res[1] !== 0) throw new Error(E_SOCKS_AUTH_FAIL);
	}
	const encoder = new TextEncoder(); let DSTADDR;
	switch (addrType) {
		case ADDRESS_TYPE_IPV4: DSTADDR = new Uint8Array([1, ...address.split('.').map(Number)]); break;
		case ADDRESS_TYPE_URL: DSTADDR = new Uint8Array([3, address.length, ...encoder.encode(address)]); break;
		case ADDRESS_TYPE_IPV6: DSTADDR = new Uint8Array([4, ...address.split(':').flatMap(x => [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2), 16)])]); break;
		default: throw new Error(E_INVALID_ADDR_TYPE);
	}
	await writer.write(new Uint8Array([5, 1, 0, ...DSTADDR, port >> 8, port & 255]));
	res = (await reader.read()).value;
	if (res[1] !== 0) throw new Error(E_SOCKS_CONN_FAIL);
	writer.releaseLock(); reader.releaseLock();
	return socket;
}

function parseSocksConfig(address) {
	let [latter, former] = address.split("@").reverse(); 
	let username, password, hostname, socksPort;
	
	if (former) { 
		const formers = former.split(":"); 
		if (formers.length !== 2) throw new Error(E_INVALID_SOCKS_ADDR);
		[username, password] = formers; 
	}
	
	const latters = latter.split(":"); 
	socksPort = Number(latters.pop()); 
	if (isNaN(socksPort)) throw new Error(E_INVALID_SOCKS_ADDR);
	
	hostname = latters.join(":"); 
	if (hostname.includes(":") && !/^\[.*\]$/.test(hostname)) throw new Error(E_INVALID_SOCKS_ADDR);
	
	return { username, password, hostname, socksPort };
}

async function handleSubscriptionPage(request, user = null) {
	if (!user) user = authToken;
	
	const pageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>璁㈤槄涓績</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Courier New", monospace;
            background: #000; color: #00ff00; min-height: 100vh;
            overflow-x: hidden; position: relative;
        }
        .matrix-bg {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%);
            z-index: -1;
            animation: bg-pulse 8s ease-in-out infinite;
        }
        @keyframes bg-pulse {
            0%, 100% { background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%); }
            50% { background: linear-gradient(45deg, #000 0%, #002200 50%, #000 100%); }
        }
        .matrix-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px);
            animation: matrix-fall 20s linear infinite;
            z-index: -1;
        }
        @keyframes matrix-fall {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
        }
        .matrix-code-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: -1;
            overflow: hidden;
        }
        .matrix-column {
            position: absolute; top: -100%; left: 0;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 14px; line-height: 1.2;
            animation: matrix-drop 15s linear infinite;
            text-shadow: 0 0 5px #00ff00;
        }
        @keyframes matrix-drop {
            0% { top: -100%; opacity: 1; }
            10% { opacity: 1; }
            90% { opacity: 0.3; }
            100% { top: 100vh; opacity: 0; }
        }
        .matrix-column:nth-child(odd) {
            animation-duration: 12s;
            animation-delay: -2s;
        }
        .matrix-column:nth-child(even) {
            animation-duration: 18s;
            animation-delay: -5s;
        }
        .matrix-column:nth-child(3n) {
            animation-duration: 20s;
            animation-delay: -8s;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; position: relative; z-index: 1; }
        .header { text-align: center; margin-bottom: 40px; }
        .title {
            font-size: 3.5rem; font-weight: bold;
            text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00;
            margin-bottom: 10px;
            animation: matrix-glow 1.5s ease-in-out infinite alternate, matrix-pulse 3s ease-in-out infinite;
            position: relative;
            background: linear-gradient(45deg, #00ff00, #00aa00, #00ff00);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        @keyframes matrix-glow {
            from { text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00; }
            to { text-shadow: 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00, 0 0 50px #00ff00; }
        }
        @keyframes matrix-pulse {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .subtitle { color: #00aa00; margin-bottom: 30px; font-size: 1.2rem; }
        .card {
            background: rgba(0, 20, 0, 0.9);
            border: 2px solid #00ff00;
            border-radius: 0; padding: 30px; margin-bottom: 20px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1);
            position: relative;
            backdrop-filter: blur(10px);
            animation: card-glow 4s ease-in-out infinite;
        }
        @keyframes card-glow {
            0%, 100% { box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1); }
            50% { box-shadow: 0 0 40px rgba(0, 255, 0, 0.7), inset 0 0 30px rgba(0, 255, 0, 0.2); }
        }
        .card::before {
            content: ""; position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(45deg, transparent 49%, #00ff00 50%, transparent 51%);
            opacity: 0.2; pointer-events: none;
            animation: scan-line 3s linear infinite;
        }
        @keyframes scan-line {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .card-title {
            font-size: 1.8rem; margin-bottom: 20px;
            color: #00ff00; text-shadow: 0 0 5px #00ff00;
        }
        .client-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px; margin: 20px 0;
        }
        .client-btn {
            background: rgba(0, 20, 0, 0.8);
            border: 2px solid #00ff00;
            padding: 15px 20px; color: #00ff00;
            font-family: "Courier New", monospace; font-weight: bold;
            cursor: pointer; transition: all 0.4s ease;
            text-align: center; position: relative;
            overflow: hidden;
            text-shadow: 0 0 5px #00ff00;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        }
        .client-btn::before {
            content: ""; position: absolute; top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,255,0,0.4), transparent);
            transition: left 0.6s ease;
        }
        .client-btn::after {
            content: ""; position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(45deg, transparent 30%, rgba(0,255,0,0.1) 50%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .client-btn:hover::before { left: 100%; }
        .client-btn:hover::after { opacity: 1; }
        .client-btn:hover {
            background: rgba(0, 255, 0, 0.3);
            box-shadow: 0 0 25px #00ff00, 0 0 35px rgba(0, 255, 0, 0.5);
            transform: translateY(-3px) scale(1.05);
            text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
        }
        .generate-btn {
            background: rgba(0, 255, 0, 0.15);
            border: 2px solid #00ff00; padding: 15px 30px;
            color: #00ff00; font-family: "Courier New", monospace;
            font-weight: bold; cursor: pointer;
            transition: all 0.4s ease; margin-right: 15px;
            text-shadow: 0 0 8px #00ff00;
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
            position: relative;
            overflow: hidden;
        }
        .generate-btn::before {
            content: ""; position: absolute; top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,255,0,0.5), transparent);
            transition: left 0.8s ease;
        }
        .generate-btn:hover::before { left: 100%; }
        .generate-btn:hover {
            background: rgba(0, 255, 0, 0.4);
            box-shadow: 0 0 30px #00ff00, 0 0 40px rgba(0, 255, 0, 0.6);
            transform: translateY(-4px) scale(1.08);
            text-shadow: 0 0 15px #00ff00, 0 0 25px #00ff00;
        }
        .subscription-url {
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ff00; padding: 15px;
            word-break: break-all; font-family: "Courier New", monospace;
            color: #00ff00; margin-top: 20px; display: none;
            box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.4), 0 0 20px rgba(0, 255, 0, 0.3);
            border-radius: 5px;
            animation: url-glow 2s ease-in-out infinite alternate;
            position: relative;
            overflow: hidden;
        }
        @keyframes url-glow {
            from { box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.4), 0 0 20px rgba(0, 255, 0, 0.3); }
            to { box-shadow: inset 0 0 20px rgba(0, 255, 0, 0.6), 0 0 30px rgba(0, 255, 0, 0.5); }
        }
        .subscription-url::before {
            content: ""; position: absolute; top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,255,0,0.1), transparent);
            animation: url-scan 3s linear infinite;
        }
        @keyframes url-scan {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        .matrix-text {
            position: fixed; top: 20px; right: 20px;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 0.8rem; opacity: 0.6;
            animation: matrix-flicker 3s infinite;
        }
        @keyframes matrix-flicker {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    <div class="matrix-rain"></div>
    <div class="matrix-code-rain" id="matrixCodeRain"></div>
    <div class="matrix-text">浠ｇ悊璁㈤槄涓績 v1.1</div>
    <div class="container">
        <div class="header">
            <h1 class="title">浠ｇ悊璁㈤槄涓績</h1>
            <p class="subtitle">澶氬鎴风鏀寔 鈥?鏅鸿兘浼橀€?鈥?涓€閿敓鎴?/p>
        </div>
        <div class="card">
            <h2 class="card-title">[ 閫夋嫨瀹㈡埛绔?]</h2>
            <div class="client-grid">
                <button class="client-btn" onclick="generateClientLink(atob('Y2xhc2g='))">CLASH</button>
                <button class="client-btn" onclick="generateClientLink(atob('c3VyZ2U='))">SURGE</button>
                <button class="client-btn" onclick="generateClientLink(atob('c2luZ2JveA=='))">SING-BOX</button>
                <button class="client-btn" onclick="generateClientLink(atob('bG9vbg=='))">LOON</button>
                <button class="client-btn" onclick="generateClientLink(atob('djJyYXk='))">V2RAY</button>
            </div>
            <div class="subscription-url" id="clientSubscriptionUrl"></div>
        </div>
        <div class="card">
            <h2 class="card-title">[ 蹇€熻幏鍙?]</h2>
            <button class="generate-btn" onclick="getBase64Subscription()">鑾峰彇璁㈤槄閾炬帴</button>
            <div class="subscription-url" id="base64SubscriptionUrl"></div>
        </div>
        <div class="card">
            <h2 class="card-title">[ 绯荤粺鐘舵€?]</h2>
            <div id="systemStatus" style="margin: 20px 0; padding: 15px; background: rgba(0, 20, 0, 0.8); border: 2px solid #00ff00; box-shadow: 0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 15px rgba(0, 255, 0, 0.1); position: relative; overflow: hidden;">
                <div style="color: #00ff00; margin-bottom: 15px; font-weight: bold; text-shadow: 0 0 5px #00ff00;">[ 绯荤粺妫€娴嬩腑... ]</div>
                <div id="regionStatus" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">Worker鍦板尯: 妫€娴嬩腑...</div>
                <div id="geoInfo" style="margin: 8px 0; color: #00aa00; font-family: 'Courier New', monospace; font-size: 0.9rem; text-shadow: 0 0 3px #00aa00;">妫€娴嬫柟寮? 妫€娴嬩腑...</div>
                <div id="backupStatus" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">ProxyIP鐘舵€? 妫€娴嬩腑...</div>
                <div id="currentIP" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">褰撳墠浣跨敤IP: 妫€娴嬩腑...</div>
                <div id="regionMatch" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">鍦板尯鍖归厤: 妫€娴嬩腑...</div>
                <div id="selectionLogic" style="margin: 8px 0; color: #00aa00; font-family: 'Courier New', monospace; font-size: 0.9rem; text-shadow: 0 0 3px #00aa00;">閫夋嫨閫昏緫: 鍚屽湴鍖?鈫?閭昏繎鍦板尯 鈫?鍏朵粬鍦板尯</div>
            </div>
        </div>
        <div class="card" id="configCard" style="display: none;">
            <h2 class="card-title">[ 閰嶇疆绠＄悊 ]</h2>
            <div id="kvStatus" style="margin-bottom: 20px; padding: 10px; background: rgba(0, 20, 0, 0.8); border: 1px solid #00ff00; color: #00ff00;">
                妫€娴婯V鐘舵€佷腑...
            </div>
            <div id="configContent" style="display: none;">
                <form id="regionForm" style="margin-bottom: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">鎸囧畾鍦板尯 (wk):</label>
                        <select id="wkRegion" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                            <option value="">鑷姩妫€娴?/option>
                            <option value="US">馃嚭馃嚫 缇庡浗</option>
                            <option value="SG">馃嚫馃嚞 鏂板姞鍧?/option>
                            <option value="JP">馃嚡馃嚨 鏃ユ湰</option>
                            <option value="HK">馃嚟馃嚢 棣欐腐</option>
                            <option value="KR">馃嚢馃嚪 闊╁浗</option>
                            <option value="DE">馃嚛馃嚜 寰峰浗</option>
                            <option value="SE">馃嚫馃嚜 鐟炲吀</option>
                            <option value="NL">馃嚦馃嚤 鑽峰叞</option>
                            <option value="FI">馃嚝馃嚠 鑺叞</option>
                            <option value="GB">馃嚞馃嚙 鑻卞浗</option>
                        </select>
                        <small id="wkRegionHint" style="color: #00aa00; font-size: 0.85rem; display: none;">鈿狅笍 浣跨敤鑷畾涔塒roxyIP鏃讹紝鍦板尯閫夋嫨宸茬鐢?/small>
                    </div>
                    <button type="submit" style="background: rgba(0, 255, 0, 0.15); border: 2px solid #00ff00; padding: 12px 24px; color: #00ff00; font-family: 'Courier New', monospace; font-weight: bold; cursor: pointer; margin-right: 10px; text-shadow: 0 0 8px #00ff00; transition: all 0.4s ease;">淇濆瓨鍦板尯閰嶇疆</button>
                </form>
                <form id="otherConfigForm" style="margin-bottom: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">鑷畾涔塒roxyIP (p):</label>
                        <input type="text" id="customIP" placeholder="渚嬪: 1.2.3.4:443" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                        <small style="color: #00aa00; font-size: 0.85rem;">鑷畾涔塒roxyIP鍦板潃鍜岀鍙?/small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">浼橀€塈P鍒楄〃 (yx):</label>
                        <input type="text" id="preferredIPs" placeholder="渚嬪: 1.2.3.4:443#棣欐腐鑺傜偣,5.6.7.8:80#缇庡浗鑺傜偣,example.com:8443#鏂板姞鍧¤妭鐐? style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                        <small style="color: #00aa00; font-size: 0.85rem;">鏍煎紡: IP:绔彛#鑺傜偣鍚嶇О 鎴?IP:绔彛 (鏃?鍒欎娇鐢ㄩ粯璁ゅ悕绉?銆傛敮鎸佸涓紝鐢ㄩ€楀彿鍒嗛殧銆?span style="color: #ffaa00;">API娣诲姞鐨処P浼氳嚜鍔ㄦ樉绀哄湪杩欓噷銆?/span></small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">浼橀€塈P鏉ユ簮URL (yxURL):</label>
                        <input type="text" id="preferredIPsURL" placeholder="榛樿: https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                        <small style="color: #00aa00; font-size: 0.85rem;">鑷畾涔変紭閫塈P鍒楄〃鏉ユ簮URL锛岀暀绌哄垯浣跨敤榛樿鍦板潃</small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">SOCKS5閰嶇疆 (s):</label>
                        <input type="text" id="socksConfig" placeholder="渚嬪: user:pass@host:port 鎴?host:port" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                        <small style="color: #00aa00; font-size: 0.85rem;">SOCKS5浠ｇ悊鍦板潃锛岀敤浜庤浆鍙戞墍鏈夊嚭绔欐祦閲?/small>
                    </div>
                    <button type="submit" style="background: rgba(0, 255, 0, 0.15); border: 2px solid #00ff00; padding: 12px 24px; color: #00ff00; font-family: 'Courier New', monospace; font-weight: bold; cursor: pointer; margin-right: 10px; text-shadow: 0 0 8px #00ff00; transition: all 0.4s ease;">淇濆瓨閰嶇疆</button>
                </form>
                
                <h3 style="color: #00ff00; margin: 20px 0 15px 0; font-size: 1.2rem;">楂樼骇鎺у埗</h3>
                <form id="advancedConfigForm" style="margin-bottom: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">鍏佽API绠＄悊 (apiEnabled):</label>
                        <select id="apiEnabled" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                            <option value="">榛樿锛堝叧闂瑼PI锛?/option>
                            <option value="yes">寮€鍚疉PI绠＄悊</option>
                        </select>
                        <small style="color: #ffaa00; font-size: 0.85rem;">鈿狅笍 瀹夊叏鎻愰啋锛氬紑鍚悗鍏佽閫氳繃API鍔ㄦ€佹坊鍔犱紭閫塈P銆傚缓璁粎鍦ㄩ渶瑕佹椂寮€鍚€?/small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">鍦板尯鍖归厤 (rm):</label>
                        <select id="regionMatching" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                            <option value="">榛樿锛堝惎鐢ㄥ湴鍖哄尮閰嶏級</option>
                            <option value="no">鍏抽棴鍦板尯鍖归厤</option>
                        </select>
                        <small style="color: #00aa00; font-size: 0.85rem;">璁剧疆涓?鍏抽棴"鏃朵笉杩涜鍦板尯鏅鸿兘鍖归厤</small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">闄嶇骇鎺у埗 (qj):</label>
                        <select id="downgradeControl" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                            <option value="">榛樿锛堜笉鍚敤闄嶇骇锛?/option>
                            <option value="no">鍚敤闄嶇骇妯″紡</option>
                        </select>
                        <small style="color: #00aa00; font-size: 0.85rem;">璁剧疆涓?鍚敤"鏃讹細CF鐩磋繛澶辫触鈫扴OCKS5杩炴帴鈫抐allback鍦板潃</small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">TLS鎺у埗 (dkby):</label>
                        <select id="portControl" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                            <option value="">榛樿锛堜繚鐣欐墍鏈夎妭鐐癸級</option>
                            <option value="yes">浠匱LS鑺傜偣</option>
                        </select>
                        <small style="color: #00aa00; font-size: 0.85rem;">璁剧疆涓?浠匱LS鑺傜偣"鏃跺彧鐢熸垚甯LS鐨勮妭鐐癸紝涓嶇敓鎴愰潪TLS鑺傜偣锛堝80绔彛锛?/small>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; color: #00ff00; font-weight: bold; text-shadow: 0 0 3px #00ff00;">浼橀€夋帶鍒?(yxby):</label>
                        <select id="preferredControl" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ff00; color: #00ff00; font-family: 'Courier New', monospace; font-size: 14px;">
                            <option value="">榛樿锛堝惎鐢ㄤ紭閫夛級</option>
                            <option value="yes">鍏抽棴浼橀€?/option>
                        </select>
                        <small style="color: #00aa00; font-size: 0.85rem;">璁剧疆涓?鍏抽棴浼橀€?鏃跺彧浣跨敤鍘熺敓鍦板潃锛屼笉鐢熸垚浼橀€塈P鍜屽煙鍚嶈妭鐐?/small>
                    </div>
                    <button type="submit" style="background: rgba(0, 255, 0, 0.15); border: 2px solid #00ff00; padding: 12px 24px; color: #00ff00; font-family: 'Courier New', monospace; font-weight: bold; cursor: pointer; margin-right: 10px; text-shadow: 0 0 8px #00ff00; transition: all 0.4s ease;">淇濆瓨楂樼骇閰嶇疆</button>
                </form>
                <div id="currentConfig" style="background: rgba(0, 0, 0, 0.9); border: 1px solid #00ff00; padding: 15px; margin: 10px 0; font-family: 'Courier New', monospace; color: #00ff00;">
                    鍔犺浇涓?..
                </div>
                <button onclick="loadCurrentConfig()" style="background: rgba(0, 255, 0, 0.15); border: 2px solid #00ff00; padding: 12px 24px; color: #00ff00; font-family: 'Courier New', monospace; font-weight: bold; cursor: pointer; margin-right: 10px; text-shadow: 0 0 8px #00ff00; transition: all 0.4s ease;">鍒锋柊閰嶇疆</button>
                <button onclick="resetAllConfig()" style="background: rgba(255, 0, 0, 0.15); border: 2px solid #ff0000; padding: 12px 24px; color: #ff0000; font-family: 'Courier New', monospace; font-weight: bold; cursor: pointer; text-shadow: 0 0 8px #ff0000; transition: all 0.4s ease;">閲嶇疆閰嶇疆</button>
            </div>
            <div id="statusMessage" style="display: none; padding: 10px; margin: 10px 0; border: 1px solid #00ff00; background: rgba(0, 20, 0, 0.8); color: #00ff00; text-shadow: 0 0 5px #00ff00;"></div>
        </div>
        
        <div class="card">
            <h2 class="card-title">[ 鐩稿叧閾炬帴 ]</h2>
            <div style="text-align: center; margin: 20px 0;">
                <a href="https://github.com/byJoey/cfnew" target="_blank" style="color: #00ff00; text-decoration: none; margin: 0 20px; font-size: 1.2rem; text-shadow: 0 0 5px #00ff00;">GitHub 椤圭洰</a>
                <a href="https://www.youtube.com/@joeyblog" target="_blank" style="color: #00ff00; text-decoration: none; margin: 0 20px; font-size: 1.2rem; text-shadow: 0 0 5px #00ff00;">YouTube @joeyblog</a>
            </div>
        </div>
    </div>
    <script>
        function generateClientLink(clientType) {
            var currentUrl = window.location.href;
            var subscriptionUrl = currentUrl + "/sub";
            
            if (clientType === atob('djJyYXk=')) {
                document.getElementById("clientSubscriptionUrl").textContent = subscriptionUrl;
                document.getElementById("clientSubscriptionUrl").style.display = "block";
                navigator.clipboard.writeText(subscriptionUrl).then(function() {
                    alert("V2Ray 璁㈤槄閾炬帴宸插鍒?);
                });
            } else {
                var encodedUrl = encodeURIComponent(subscriptionUrl);
                var apiUrl = "https://url.v1.mk/sub?target=" + clientType + "&url=" + encodedUrl + "&insert=false";
                document.getElementById("clientSubscriptionUrl").textContent = apiUrl;
                document.getElementById("clientSubscriptionUrl").style.display = "block";
                navigator.clipboard.writeText(apiUrl).then(function() {
                    var displayName = clientType.toUpperCase();
                    if (clientType === atob('c3VyZ2U=')) displayName = 'SURGE';
                    if (clientType === atob('c2luZ2JveA==')) displayName = 'SING-BOX';
                    alert(displayName + " 璁㈤槄閾炬帴宸插鍒?);
                });
            }
        }
        function getBase64Subscription() {
            var currentUrl = window.location.href;
            var subscriptionUrl = currentUrl + "/sub";
            
            fetch(subscriptionUrl)
                .then(function(response) {
                    return response.text();
                })
                .then(function(base64Content) {
                    document.getElementById("base64SubscriptionUrl").textContent = base64Content;
                    document.getElementById("base64SubscriptionUrl").style.display = "block";
                    navigator.clipboard.writeText(base64Content).then(function() {
                        alert("Base64璁㈤槄鍐呭宸插鍒?);
                    });
                })
                .catch(function(error) {
                    console.error("鑾峰彇璁㈤槄澶辫触:", error);
                    alert("鑾峰彇璁㈤槄澶辫触锛岃閲嶈瘯");
                });
        }
        
        function createMatrixRain() {
            const matrixContainer = document.getElementById('matrixCodeRain');
            const matrixChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const columns = Math.floor(window.innerWidth / 18);
            
            for (let i = 0; i < columns; i++) {
                const column = document.createElement('div');
                column.className = 'matrix-column';
                column.style.left = (i * 18) + 'px';
                column.style.animationDelay = Math.random() * 15 + 's';
                column.style.animationDuration = (Math.random() * 15 + 8) + 's';
                column.style.fontSize = (Math.random() * 4 + 12) + 'px';
                column.style.opacity = Math.random() * 0.8 + 0.2;
                
                let text = '';
                const charCount = Math.floor(Math.random() * 30 + 20);
                for (let j = 0; j < charCount; j++) {
                    const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                    const brightness = Math.random() > 0.1 ? '#00ff00' : '#00aa00';
                    text += '<span style="color: ' + brightness + ';">' + char + '</span><br>';
                }
                column.innerHTML = text;
                matrixContainer.appendChild(column);
            }
            
            setInterval(function() {
                const columns = matrixContainer.querySelectorAll('.matrix-column');
                columns.forEach(function(column) {
                    if (Math.random() > 0.95) {
                        const chars = column.querySelectorAll('span');
                        if (chars.length > 0) {
                            const randomChar = chars[Math.floor(Math.random() * chars.length)];
                            randomChar.style.color = '#ffffff';
                            setTimeout(function() {
                                randomChar.style.color = '#00ff00';
                            }, 200);
                        }
                    }
                });
            }, 100);
        }
        
        async function checkSystemStatus() {
            try {
                const cfStatus = document.getElementById('cfStatus');
                const regionStatus = document.getElementById('regionStatus');
                const geoInfo = document.getElementById('geoInfo');
                const backupStatus = document.getElementById('backupStatus');
                const currentIP = document.getElementById('currentIP');
                const regionMatch = document.getElementById('regionMatch');
                
                const regionNames = {
                    'US': '🇺🇸 美国', 'SG': '🇸🇬 新加坡', 'JP': '🇯🇵 日本', 'HK': '🇭🇰 香港',
                    'KR': '🇰🇷 韩国', 'DE': '🇩🇪 德国', 'SE': '🇸🇪 瑞典', 'NL': '🇳🇱 荷兰',
                      'FI': '🇫🇮 芬兰', 'GB': '🇬🇧 英国'
                };
                
                let detectedRegion = 'US'; // 榛樿鍊?                let isCustomIPMode = false;
                let isManualRegionMode = false;
                try {
                    const response = await fetch('/region');
                    const data = await response.json();
                    
                    
                    if (data.region === 'CUSTOM') {
                        isCustomIPMode = true;
                        detectedRegion = 'CUSTOM';
                        
                        // 鑾峰彇鑷畾涔塈P鐨勮缁嗕俊鎭?                        const customIPInfo = data.customIP || '鏈煡';
                        
                        geoInfo.innerHTML = '妫€娴嬫柟寮? <span style="color: #ffaa00;">鈿欙笍 鑷畾涔塒roxyIP妯″紡 (p鍙橀噺鍚敤)</span>';
                        regionStatus.innerHTML = 'Worker鍦板尯: <span style="color: #ffaa00;">馃敡 鑷畾涔塈P妯″紡 (宸茬鐢ㄥ湴鍖哄尮閰?</span>';
                        
                        // 鏄剧ず鑷畾涔塈P閰嶇疆鐘舵€侊紝鍖呭惈鍏蜂綋IP
                        if (backupStatus) backupStatus.innerHTML = 'ProxyIP鐘舵€? <span style="color: #ffaa00;">馃敡 浣跨敤鑷畾涔塒roxyIP: ' + customIPInfo + '</span>';
                        if (currentIP) currentIP.innerHTML = '褰撳墠浣跨敤IP: <span style="color: #ffaa00;">鉁?' + customIPInfo + ' (p鍙橀噺閰嶇疆)</span>';
                        if (regionMatch) regionMatch.innerHTML = '鍦板尯鍖归厤: <span style="color: #ffaa00;">鈿狅笍 鑷畾涔塈P妯″紡锛屽湴鍖洪€夋嫨宸茬鐢?/span>';
                        
                        return; // 鎻愬墠杩斿洖锛屼笉鎵ц鍚庣画鐨勫湴鍖哄尮閰嶉€昏緫
                    } else if (data.detectionMethod === '鎵嬪姩鎸囧畾鍦板尯') {
                        isManualRegionMode = true;
                        detectedRegion = data.region;
                        
                        geoInfo.innerHTML = '妫€娴嬫柟寮? <span style="color: #44aa44;">鎵嬪姩鎸囧畾鍦板尯</span>';
                        regionStatus.innerHTML = 'Worker鍦板尯: <span style="color: #44ff44;">馃幆 ' + regionNames[detectedRegion] + ' (鎵嬪姩鎸囧畾)</span>';
                        
                        // 鏄剧ず閰嶇疆鐘舵€佽€屼笉鏄娴嬬姸鎬?                        if (backupStatus) backupStatus.innerHTML = 'ProxyIP鐘舵€? <span style="color: #44ff44;">鉁?10/10 鍙敤 (ProxyIP鍩熷悕棰勮鍙敤)</span>';
                        if (currentIP) currentIP.innerHTML = '褰撳墠浣跨敤IP: <span style="color: #44ff44;">鉁?鏅鸿兘灏辫繎閫夋嫨涓?/span>';
                        if (regionMatch) regionMatch.innerHTML = '鍦板尯鍖归厤: <span style="color: #44ff44;">鉁?鍚屽湴鍖篒P鍙敤 (1涓?</span>';
                        
                        return; // 鎻愬墠杩斿洖锛屼笉鎵ц鍚庣画鐨勫湴鍖哄尮閰嶉€昏緫
                    } else if (data.region && regionNames[data.region]) {
                        detectedRegion = data.region;
                    }
                    
                    geoInfo.innerHTML = '妫€娴嬫柟寮? <span style="color: #44ff44;">Cloudflare鍐呯疆妫€娴?/span>';
                    
                } catch (e) {
                    geoInfo.innerHTML = '妫€娴嬫柟寮? <span style="color: #ff4444;">妫€娴嬪け璐?/span>';
                }
                
                regionStatus.innerHTML = 'Worker鍦板尯: <span style="color: #44ff44;">鉁?' + regionNames[detectedRegion] + '</span>';
                
                
                // 鐩存帴鏄剧ず閰嶇疆鐘舵€侊紝涓嶅啀杩涜妫€娴?                if (backupStatus) {
                    backupStatus.innerHTML = 'ProxyIP鐘舵€? <span style="color: #44ff44;">鉁?10/10 鍙敤 (ProxyIP鍩熷悕棰勮鍙敤)</span>';
                }
                
                if (currentIP) {
                    currentIP.innerHTML = '褰撳墠浣跨敤IP: <span style="color: #44ff44;">鉁?鏅鸿兘灏辫繎閫夋嫨涓?/span>';
                }
                
                if (regionMatch) {
                    regionMatch.innerHTML = '鍦板尯鍖归厤: <span style="color: #44ff44;">鉁?鍚屽湴鍖篒P鍙敤 (1涓?</span>';
                }
                
            } catch (error) {
                console.error('鐘舵€佹娴嬪け璐?', error);
                document.getElementById('regionStatus').innerHTML = 'Worker鍦板尯: <span style="color: #ff4444;">鉂?妫€娴嬪け璐?/span>';
                document.getElementById('geoInfo').innerHTML = '鍦扮悊浣嶇疆: <span style="color: #ff4444;">鉂?妫€娴嬪け璐?/span>';
                document.getElementById('backupStatus').innerHTML = 'ProxyIP鐘舵€? <span style="color: #ff4444;">鉂?妫€娴嬪け璐?/span>';
                document.getElementById('currentIP').innerHTML = '褰撳墠浣跨敤IP: <span style="color: #ff4444;">鉂?妫€娴嬪け璐?/span>';
                document.getElementById('regionMatch').innerHTML = '鍦板尯鍖归厤: <span style="color: #ff4444;">鉂?妫€娴嬪け璐?/span>';
            }
        }
        
        async function testAPI() {
            try {
                const response = await fetch('/test-api');
                const data = await response.json();
                
                
                if (data.detectedRegion) {
                    alert('API妫€娴嬬粨鏋? ' + data.detectedRegion + '\\n妫€娴嬫椂闂? ' + data.timestamp);
                } else {
                    alert('API妫€娴嬪け璐? ' + (data.error || '鏈煡閿欒'));
                }
            } catch (error) {
                console.error('API娴嬭瘯澶辫触:', error);
                alert('API娴嬭瘯澶辫触: ' + error.message);
            }
        }
        
        // 閰嶇疆绠＄悊鐩稿叧鍑芥暟
        async function checkKVStatus() {
            const apiUrl = window.location.pathname + '/api/config';
            console.log('馃攳 璋冭瘯淇℃伅 - 妫€鏌V鐘舵€?);
            console.log('璇锋眰URL:', apiUrl);
            
            try {
                const response = await fetch(apiUrl);
                console.log('鍝嶅簲鐘舵€?', response.status);
                console.log('鍝嶅簲澶?', Object.fromEntries(response.headers.entries()));
                
                if (response.status === 503) {
                    // KV鏈厤缃?                    console.log('鉂?KV瀛樺偍鏈厤缃?(503)');
                    document.getElementById('kvStatus').innerHTML = '<span style="color: #ffaa00;">鈿狅笍 KV瀛樺偍鏈惎鐢ㄦ垨鏈厤缃?/span>';
                    document.getElementById('configCard').style.display = 'block';
                    document.getElementById('currentConfig').textContent = 'KV瀛樺偍鏈厤缃紝鏃犳硶浣跨敤閰嶇疆绠＄悊鍔熻兘銆俓\n\\n璇峰湪Cloudflare Workers涓?\\n1. 鍒涘缓KV鍛藉悕绌洪棿\\n2. 缁戝畾鐜鍙橀噺 C\\n3. 閲嶆柊閮ㄧ讲浠ｇ爜';
                } else if (response.ok) {
                    const data = await response.json();
                    console.log('鍝嶅簲鏁版嵁:', data);
                    console.log('kvEnabled:', data.kvEnabled);
                    
                    // 妫€鏌ュ搷搴旀槸鍚﹀寘鍚獽V閰嶇疆淇℃伅
                    if (data && data.kvEnabled === true) {
                        console.log('鉁?KV瀛樺偍宸插惎鐢?);
                        document.getElementById('kvStatus').innerHTML = '<span style="color: #44ff44;">鉁?KV瀛樺偍宸插惎鐢紝鍙互浣跨敤閰嶇疆绠＄悊鍔熻兘</span>';
                        document.getElementById('configContent').style.display = 'block';
                        document.getElementById('configCard').style.display = 'block';
                        await loadCurrentConfig();
                    } else {
                        console.log('鉂?KV瀛樺偍鏈惎鐢?(鍝嶅簲涓璳vEnabled涓嶄负true)');
                        document.getElementById('kvStatus').innerHTML = '<span style="color: #ffaa00;">鈿狅笍 KV瀛樺偍鏈惎鐢ㄦ垨鏈厤缃?/span>';
                        document.getElementById('configCard').style.display = 'block';
                        document.getElementById('currentConfig').textContent = 'KV瀛樺偍鏈厤缃?;
                    }
                } else {
                    console.log('鉂?鍝嶅簲閿欒:', response.status, response.statusText);
                    document.getElementById('kvStatus').innerHTML = '<span style="color: #ffaa00;">鈿狅笍 KV瀛樺偍鏈惎鐢ㄦ垨鏈厤缃?/span>';
                    document.getElementById('configCard').style.display = 'block';
                    document.getElementById('currentConfig').textContent = 'KV瀛樺偍妫€娴嬪け璐?- 鐘舵€佺爜: ' + response.status;
                }
            } catch (error) {
                console.log('鉂?璇锋眰澶辫触:', error);
                document.getElementById('kvStatus').innerHTML = '<span style="color: #ffaa00;">鈿狅笍 KV瀛樺偍鏈惎鐢ㄦ垨鏈厤缃?/span>';
                document.getElementById('configCard').style.display = 'block';
                document.getElementById('currentConfig').textContent = 'KV瀛樺偍妫€娴嬪け璐?- 閿欒: ' + error.message;
            }
        }
        
        async function loadCurrentConfig() {
            const apiUrl = window.location.pathname + '/api/config';
            console.log('馃摜 璋冭瘯淇℃伅 - 鍔犺浇閰嶇疆');
            console.log('璇锋眰URL:', apiUrl);
            
            try {
                const response = await fetch(apiUrl);
                console.log('鍔犺浇鍝嶅簲鐘舵€?', response.status);
                
                if (response.status === 503) {
                    console.log('鉂?KV瀛樺偍鏈厤缃紝鏃犳硶鍔犺浇閰嶇疆');
                    document.getElementById('currentConfig').textContent = 'KV瀛樺偍鏈厤缃紝鏃犳硶鍔犺浇閰嶇疆';
                    return;
                }
                if (!response.ok) {
                    console.log('鉂?鍔犺浇閰嶇疆澶辫触锛岀姸鎬佺爜:', response.status);
                    document.getElementById('currentConfig').textContent = '鍔犺浇閰嶇疆澶辫触';
                    return;
                }
                const config = await response.json();
                console.log('鍔犺浇鐨勯厤缃暟鎹?', config);
                
                // 杩囨护鎺夊唴閮ㄥ瓧娈?kvEnabled
                const displayConfig = {};
                for (const [key, value] of Object.entries(config)) {
                    if (key !== 'kvEnabled') {
                        displayConfig[key] = value;
                    }
                }
                
                let configText = '褰撳墠閰嶇疆:\\n';
                if (Object.keys(displayConfig).length === 0) {
                    configText += '(鏆傛棤閰嶇疆)';
                } else {
                    for (const [key, value] of Object.entries(displayConfig)) {
                        configText += key + ': ' + (value || '(鏈缃?') + '\\n';
                    }
                }
                
                document.getElementById('currentConfig').textContent = configText;
                
                // 鏇存柊琛ㄥ崟鍊?                document.getElementById('wkRegion').value = config.wk || '';
                document.getElementById('customIP').value = config.p || '';
                document.getElementById('preferredIPs').value = config.yx || '';
                document.getElementById('preferredIPsURL').value = config.yxURL || '';
                document.getElementById('socksConfig').value = config.s || '';
                document.getElementById('apiEnabled').value = config.apiEnabled || '';
                document.getElementById('regionMatching').value = config.rm || '';
                document.getElementById('downgradeControl').value = config.qj || '';
                document.getElementById('portControl').value = config.dkby || '';
                document.getElementById('preferredControl').value = config.yxby || '';
                
                // 妫€鏌鍙橀噺锛屽鏋滄湁鍊煎垯绂佺敤wk鍦板尯閫夋嫨
                updateWkRegionState();
                
            } catch (error) {
                document.getElementById('currentConfig').textContent = '鍔犺浇閰嶇疆澶辫触: ' + error.message;
            }
        }
        
        // 鏇存柊wk鍦板尯閫夋嫨鐨勫惎鐢?绂佺敤鐘舵€?        function updateWkRegionState() {
            const customIP = document.getElementById('customIP');
            const wkRegion = document.getElementById('wkRegion');
            const wkRegionHint = document.getElementById('wkRegionHint');
            
            if (customIP && wkRegion) {
                const hasCustomIP = customIP.value.trim() !== '';
                wkRegion.disabled = hasCustomIP;
                
                // 娣诲姞瑙嗚鍙嶉
                if (hasCustomIP) {
                    wkRegion.style.opacity = '0.5';
                    wkRegion.style.cursor = 'not-allowed';
                    wkRegion.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    // 鏄剧ず鎻愮ず淇℃伅
                    if (wkRegionHint) {
                        wkRegionHint.style.display = 'block';
                        wkRegionHint.style.color = '#ffaa00';
                    }
                } else {
                    wkRegion.style.opacity = '1';
                    wkRegion.style.cursor = 'pointer';
                    wkRegion.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                    // 闅愯棌鎻愮ず淇℃伅
                    if (wkRegionHint) {
                        wkRegionHint.style.display = 'none';
                    }
                }
            }
        }
        
        async function saveConfig(configData) {
            const apiUrl = window.location.pathname + '/api/config';
            console.log('馃捑 璋冭瘯淇℃伅 - 淇濆瓨閰嶇疆');
            console.log('璇锋眰URL:', apiUrl);
            console.log('閰嶇疆鏁版嵁:', configData);
            
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(configData)
                });
                
                console.log('淇濆瓨鍝嶅簲鐘舵€?', response.status);
                console.log('淇濆瓨鍝嶅簲澶?', Object.fromEntries(response.headers.entries()));
                
                if (response.status === 503) {
                    console.log('鉂?KV瀛樺偍鏈厤缃紝鏃犳硶淇濆瓨');
                    showStatus('KV瀛樺偍鏈厤缃紝鏃犳硶淇濆瓨閰嶇疆銆傝鍏堝湪Cloudflare Workers涓厤缃甂V瀛樺偍銆?, 'error');
                    return;
                }
                
                const result = await response.json();
                console.log('淇濆瓨鍝嶅簲鏁版嵁:', result);
                
                showStatus(result.message, result.success ? 'success' : 'error');
                
                if (result.success) {
                    console.log('鉁?淇濆瓨鎴愬姛锛岄噸鏂板姞杞介厤缃?);
                    await loadCurrentConfig();
                    // 鏇存柊wk鍦板尯閫夋嫨鐘舵€?                    updateWkRegionState();
                    // 淇濆瓨鎴愬姛鍚庡埛鏂伴〉闈互鏇存柊绯荤粺鐘舵€?                    setTimeout(function() {
                        window.location.reload();
                    }, 1500);
                } else {
                    console.log('鉂?淇濆瓨澶辫触:', result.message);
                }
            } catch (error) {
                console.log('鉂?淇濆瓨璇锋眰澶辫触:', error);
                showStatus('淇濆瓨澶辫触: ' + error.message, 'error');
            }
        }
        
        function showStatus(message, type) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.textContent = message;
            statusDiv.style.display = 'block';
            statusDiv.style.color = type === 'success' ? '#00ff00' : '#ff0000';
            statusDiv.style.borderColor = type === 'success' ? '#00ff00' : '#ff0000';
            
            setTimeout(function() {
                statusDiv.style.display = 'none';
            }, 3000);
        }
        
        async function resetAllConfig() {
            if (confirm('纭畾瑕侀噸缃墍鏈夐厤缃悧锛熻繖灏嗘竻绌烘墍鏈塊V閰嶇疆锛屾仮澶嶄负鐜鍙橀噺璁剧疆銆?)) {
                try {
                    const response = await fetch(window.location.pathname + '/api/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            wk: '',
                            p: '',
                            yx: '',
                            yxURL: '',
                            s: '',
                            apiEnabled: '',
                            rm: '',
                            qj: '',
                            dkby: '',
                            yxby: ''
                        })
                    });
                    
                    if (response.status === 503) {
                        showStatus('KV瀛樺偍鏈厤缃紝鏃犳硶閲嶇疆閰嶇疆銆?, 'error');
                        return;
                    }
                    
                    const result = await response.json();
                    showStatus(result.message || '閰嶇疆宸查噸缃?, result.success ? 'success' : 'error');
                    
                    if (result.success) {
                        await loadCurrentConfig();
                        // 鏇存柊wk鍦板尯閫夋嫨鐘舵€?                        updateWkRegionState();
                        // 鍒锋柊椤甸潰浠ユ洿鏂扮郴缁熺姸鎬?                        setTimeout(function() {
                            window.location.reload();
                        }, 1500);
                    }
                } catch (error) {
                    showStatus('閲嶇疆澶辫触: ' + error.message, 'error');
                }
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            createMatrixRain();
            checkSystemStatus();
            checkKVStatus();
            
            // 鐩戝惉customIP杈撳叆妗嗗彉鍖栵紝瀹炴椂鏇存柊wk鍦板尯閫夋嫨鐘舵€?            const customIPInput = document.getElementById('customIP');
            if (customIPInput) {
                customIPInput.addEventListener('input', function() {
                    updateWkRegionState();
                });
            }
            
            // 缁戝畾琛ㄥ崟浜嬩欢
            const regionForm = document.getElementById('regionForm');
            if (regionForm) {
                regionForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const wkRegion = document.getElementById('wkRegion').value;
                    await saveConfig({ wk: wkRegion });
                });
            }
            
            const otherConfigForm = document.getElementById('otherConfigForm');
            if (otherConfigForm) {
                otherConfigForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const configData = {
                        p: document.getElementById('customIP').value,
                        yx: document.getElementById('preferredIPs').value,
                        yxURL: document.getElementById('preferredIPsURL').value,
                        s: document.getElementById('socksConfig').value
                    };
                    await saveConfig(configData);
                });
            }
            
            const advancedConfigForm = document.getElementById('advancedConfigForm');
            if (advancedConfigForm) {
                advancedConfigForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const configData = {
                        apiEnabled: document.getElementById('apiEnabled').value,
                        rm: document.getElementById('regionMatching').value,
                        qj: document.getElementById('downgradeControl').value,
                        dkby: document.getElementById('portControl').value,
                        yxby: document.getElementById('preferredControl').value
                    };
                    await saveConfig(configData);
                });
            }
        });
    </script>
</body>
</html>`;
	
	return new Response(pageHtml, { 
		status: 200, 
		headers: { 'Content-Type': 'text/html; charset=utf-8' } 
	});
}

function base64ToArray(b64Str) {
	if (!b64Str) return { error: null };
	try { b64Str = b64Str.replace(/-/g, '+').replace(/_/g, '/'); return { earlyData: Uint8Array.from(atob(b64Str), (c) => c.charCodeAt(0)).buffer, error: null }; } 
    catch (error) { return { error }; }
}

function closeSocketQuietly(socket) { try { if (socket.readyState === 1 || socket.readyState === 2) socket.close(); } catch (error) {} }

const hexTable = Array.from({ length: 256 }, (v, i) => (i + 256).toString(16).slice(1));
function formatIdentifier(arr, offset = 0) {
	const id = (hexTable[arr[offset]]+hexTable[arr[offset+1]]+hexTable[arr[offset+2]]+hexTable[arr[offset+3]]+"-"+hexTable[arr[offset+4]]+hexTable[arr[offset+5]]+"-"+hexTable[arr[offset+6]]+hexTable[arr[offset+7]]+"-"+hexTable[arr[offset+8]]+hexTable[arr[offset+9]]+"-"+hexTable[arr[offset+10]]+hexTable[arr[offset+11]]+hexTable[arr[offset+12]]+hexTable[arr[offset+13]]+hexTable[arr[offset+14]]+hexTable[arr[offset+15]]).toLowerCase();
	if (!isValidFormat(id)) throw new TypeError(E_INVALID_ID_STR);
	return id;
}

async function fetchAndParseNewIPs() {
    // 浣跨敤閰嶇疆鐨刄RL锛屽鏋滄病鏈夐厤缃垯浣跨敤榛樿URL
    const url = preferredIPsURL || "https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt";
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const text = await response.text();
        const results = [];
        const lines = text.trim().replace(/\r/g, "").split('\n');
        const regex = /^([^:]+):(\d+)#(.*)$/;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            const match = trimmedLine.match(regex);
            if (match) {
                results.push({
                    ip: match[1],
                    port: parseInt(match[2], 10),
                    name: match[3].trim() || match[1]
                });
            }
        }
        return results;
    } catch (error) {
        return [];
    }
}

function generateLinksFromNewIPs(list, user, workerDomain) {
    // Cloudflare鏀寔鐨勭鍙?    const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
    const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
    
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = atob('dmxlc3M=');
    
    list.forEach(item => {
        const nodeName = item.name.replace(/\s/g, '_');
        const port = item.port;
        
        if (CF_HTTPS_PORTS.includes(port)) {
            // CF HTTPS绔彛锛岀敓鎴怲LS鑺傜偣
            const wsNodeName = `${nodeName}-${port}-WS-TLS`;
            const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=tls&sni=${workerDomain}&fp=chrome&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
            links.push(link);
        } else if (CF_HTTP_PORTS.includes(port)) {
            // CF HTTP绔彛锛岀敓鎴愰潪TLS鑺傜偣锛堥櫎闈炲惎鐢ㄤ簡disableNonTLS锛?            if (!disableNonTLS) {
                const wsNodeName = `${nodeName}-${port}-WS`;
                const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=none&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
                links.push(link);
            }
        } else {
            // 闈濩F鏍囧噯绔彛锛屽彧鐢熸垚TLS鑺傜偣锛圚TTP浼氳CF鎷︽埅锛?            const wsNodeName = `${nodeName}-${port}-WS-TLS`;
            const link = `${proto}://${user}@${item.ip}:${port}?encryption=none&security=tls&sni=${workerDomain}&fp=chrome&type=ws&host=${workerDomain}&path=${wsPath}#${encodeURIComponent(wsNodeName)}`;
            links.push(link);
        }
    });
    return links;
}

// 閰嶇疆API澶勭悊鍑芥暟
async function handleConfigAPI(request) {
    if (request.method === 'GET') {
        // 妫€鏌V鏄惁鐪熸鍙敤
        if (!kvStore) {
            return new Response(JSON.stringify({
                error: 'KV瀛樺偍鏈厤缃?,
                kvEnabled: false
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 鑾峰彇褰撳墠閰嶇疆
        return new Response(JSON.stringify({
            ...kvConfig,
            kvEnabled: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else if (request.method === 'POST') {
        // 妫€鏌V鏄惁鐪熸鍙敤
        if (!kvStore) {
            return new Response(JSON.stringify({
                success: false,
                message: 'KV瀛樺偍鏈厤缃紝鏃犳硶淇濆瓨閰嶇疆'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 鏇存柊閰嶇疆
        try {
            const newConfig = await request.json();
            
            // 鏇存柊KV閰嶇疆
            for (const [key, value] of Object.entries(newConfig)) {
                if (value === '' || value === null || value === undefined) {
                    delete kvConfig[key];
                } else {
                    kvConfig[key] = value;
                }
            }
            
            await saveKVConfig();
            
            const envFallback = getConfigValue('p', '');
            if (envFallback) {
                const fallbackValue = envFallback.toLowerCase();
                if (fallbackValue.includes(']:')) {
                    const lastColonIndex = fallbackValue.lastIndexOf(':');
                    fallbackPort = fallbackValue.slice(lastColonIndex + 1);
                    fallbackAddress = fallbackValue.slice(0, lastColonIndex);
                } else if (!fallbackValue.includes(']:') && !fallbackValue.includes(']')) {
                    [fallbackAddress, fallbackPort = '443'] = fallbackValue.split(':');
                } else {
                    fallbackAddress = fallbackValue;
                    fallbackPort = '443';
                }
            } else {
                fallbackAddress = '';
                fallbackPort = '443';
            }
            
            socks5Config = getConfigValue('s', '') || '';
            if (socks5Config) {
                try {
                    parsedSocks5Config = parseSocksConfig(socks5Config);
                    isSocksEnabled = true;
                } catch (err) {
                    isSocksEnabled = false;
                }
            } else {
                isSocksEnabled = false;
            }
            
            const newPreferredIPsURL = getConfigValue('yxURL', '') || 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
            const defaultURL = 'https://raw.githubusercontent.com/qwer-search/bestip/refs/heads/main/kejilandbestip.txt';
            if (newPreferredIPsURL !== defaultURL) {
                directDomains.length = 0;
                customPreferredIPs = [];
                customPreferredDomains = [];
            } else {
                backupIPs = [
                    { domain: 'ProxyIP.US.CMLiussss.net', region: 'US', regionCode: 'US', port: 443 },
                    { domain: 'ProxyIP.SG.CMLiussss.net', region: 'SG', regionCode: 'SG', port: 443 },
                    { domain: 'ProxyIP.JP.CMLiussss.net', region: 'JP', regionCode: 'JP', port: 443 },
                    { domain: 'ProxyIP.HK.CMLiussss.net', region: 'HK', regionCode: 'HK', port: 443 },
                    { domain: 'ProxyIP.KR.CMLiussss.net', region: 'KR', regionCode: 'KR', port: 443 },
                    { domain: 'ProxyIP.DE.CMLiussss.net', region: 'DE', regionCode: 'DE', port: 443 },
                    { domain: 'ProxyIP.SE.CMLiussss.net', region: 'SE', regionCode: 'SE', port: 443 },
                    { domain: 'ProxyIP.NL.CMLiussss.net', region: 'NL', regionCode: 'NL', port: 443 },
                    { domain: 'ProxyIP.FI.CMLiussss.net', region: 'FI', regionCode: 'FI', port: 443 },
                    { domain: 'ProxyIP.GB.CMLiussss.net', region: 'GB', regionCode: 'GB', port: 443 },
                    { domain: 'ProxyIP.Oracle.cmliussss.net', region: 'Oracle', regionCode: 'Oracle', port: 443 },
                    { domain: 'ProxyIP.DigitalOcean.CMLiussss.net', region: 'DigitalOcean', regionCode: 'DigitalOcean', port: 443 },
                    { domain: 'ProxyIP.Vultr.CMLiussss.net', region: 'Vultr', regionCode: 'Vultr', port: 443 },
                    { domain: 'ProxyIP.Multacom.CMLiussss.net', region: 'Multacom', regionCode: 'Multacom', port: 443 }
                ];
                directDomains.length = 0;
                directDomains.push(
                    { name: "cloudflare.182682.xyz", domain: "cloudflare.182682.xyz" }, 
                    { name: "speed.marisalnc.com", domain: "speed.marisalnc.com" },
                    { domain: "freeyx.cloudflare88.eu.org" }, 
                    { domain: "bestcf.top" }, 
                    { domain: "cdn.2020111.xyz" }, 
                    { domain: "cfip.cfcdn.vip" },
                    { domain: "cf.0sm.com" }, 
                    { domain: "cf.090227.xyz" }, 
                    { domain: "cf.zhetengsha.eu.org" }, 
                    { domain: "cloudflare.9jy.cc" },
                    { domain: "cf.zerone-cdn.pp.ua" }, 
                    { domain: "cfip.1323123.xyz" }, 
                    { domain: "cnamefuckxxs.yuchen.icu" }, 
                    { domain: "cloudflare-ip.mofashi.ltd" },
                    { domain: "115155.xyz" }, 
                    { domain: "cname.xirancdn.us" }, 
                    { domain: "f3058171cad.002404.xyz" }, 
                    { domain: "8.889288.xyz" },
                    { domain: "cdn.tzpro.xyz" }, 
                    { domain: "cf.877771.xyz" }, 
                    { domain: "xn--b6gac.eu.org" }
                );
            }
            
            return new Response(JSON.stringify({
                success: true,
                message: '閰嶇疆宸蹭繚瀛?,
                config: kvConfig
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                message: '淇濆瓨閰嶇疆澶辫触: ' + error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}

// 浼橀€塈P绠＄悊API澶勭悊鍑芥暟
async function handlePreferredIPsAPI(request) {
    // 妫€鏌V鏄惁鍙敤
    if (!kvStore) {
        return new Response(JSON.stringify({
            success: false,
            error: 'KV瀛樺偍鏈厤缃?,
            message: '闇€瑕侀厤缃甂V瀛樺偍鎵嶈兘浣跨敤姝ゅ姛鑳?
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // 妫€鏌PI鍔熻兘鏄惁鍚敤锛堝畨鍏ㄥ紑鍏筹級
    const apiEnabled = getConfigValue('apiEnabled', '') === 'yes';
    if (!apiEnabled) {
        return new Response(JSON.stringify({
            success: false,
            error: 'API鍔熻兘鏈惎鐢?,
            message: '鍑轰簬瀹夊叏鑰冭檻锛屼紭閫塈P API鍔熻兘榛樿鍏抽棴銆傝鍦ㄩ厤缃鐞嗛〉闈㈠紑鍚?鍏佽API绠＄悊"閫夐」鍚庝娇鐢ㄣ€?
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    try {
        if (request.method === 'GET') {
            // 浠巠x鍙橀噺鑾峰彇浼橀€塈P鍒楄〃
            const yxValue = getConfigValue('yx', '');
            const preferredIPs = parseYxToArray(yxValue);
            
            return new Response(JSON.stringify({
                success: true,
                count: preferredIPs.length,
                data: preferredIPs
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else if (request.method === 'POST') {
            // 娣诲姞浼橀€塈P锛堟敮鎸佸崟涓垨鎵归噺锛?            const body = await request.json();
            
            // 鏀寔鎵归噺娣诲姞
            const ipsToAdd = Array.isArray(body) ? body : [body];
            
            if (ipsToAdd.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '璇锋眰鏁版嵁涓虹┖',
                    message: '璇锋彁渚汭P鏁版嵁'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 浠巠x鍙橀噺鑾峰彇鐜版湁鍒楄〃
            const yxValue = getConfigValue('yx', '');
            const preferredIPs = parseYxToArray(yxValue);
            
            const addedIPs = [];
            const skippedIPs = [];
            const errors = [];
            
            for (const item of ipsToAdd) {
                // 楠岃瘉蹇呴渶瀛楁
                if (!item.ip) {
                    errors.push({ ip: '鏈煡', reason: 'IP鍦板潃鏄繀闇€鐨? });
                    continue;
                }
                
                // 瑙ｆ瀽绔彛锛岄粯璁?43
                const port = item.port || 443;
                const name = item.name || `API浼橀€?${item.ip}:${port}`;
                
                // 楠岃瘉IP鏍煎紡
                if (!isValidIP(item.ip) && !isValidDomain(item.ip)) {
                    errors.push({ ip: item.ip, reason: '鏃犳晥鐨処P鎴栧煙鍚嶆牸寮? });
                    continue;
                }
                
                // 妫€鏌ユ槸鍚﹀凡瀛樺湪
                const exists = preferredIPs.some(existItem => 
                    existItem.ip === item.ip && existItem.port === port
                );
                
                if (exists) {
                    skippedIPs.push({ ip: item.ip, port: port, reason: '宸插瓨鍦? });
                    continue;
                }
                
                // 娣诲姞鏂癐P
                const newIP = {
                    ip: item.ip,
                    port: port,
                    name: name,
                    addedAt: new Date().toISOString()
                };
                
                preferredIPs.push(newIP);
                addedIPs.push(newIP);
            }
            
            // 濡傛灉鏈塈P琚坊鍔狅紝淇濆瓨鍒皔x鍙橀噺
            if (addedIPs.length > 0) {
                const newYxValue = arrayToYx(preferredIPs);
                await setConfigValue('yx', newYxValue);
            }
            
            // 杩斿洖缁撴灉
            return new Response(JSON.stringify({
                success: addedIPs.length > 0,
                message: `鎴愬姛娣诲姞 ${addedIPs.length} 涓狪P`,
                added: addedIPs.length,
                skipped: skippedIPs.length,
                errors: errors.length,
                data: {
                    addedIPs: addedIPs,
                    skippedIPs: skippedIPs.length > 0 ? skippedIPs : undefined,
                    errors: errors.length > 0 ? errors : undefined
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else if (request.method === 'DELETE') {
            // 鍒犻櫎浼橀€塈P锛堟敮鎸佸崟涓垹闄ゆ垨涓€閿竻绌猴級
            const body = await request.json();
            
            // 妫€鏌ユ槸鍚︿负涓€閿竻绌?            if (body.all === true) {
                // 浠巠x鍙橀噺鑾峰彇鐜版湁鍒楄〃
                const yxValue = getConfigValue('yx', '');
                const preferredIPs = parseYxToArray(yxValue);
                const deletedCount = preferredIPs.length;
                
                // 娓呯┖yx鍙橀噺
                await setConfigValue('yx', '');
                
                return new Response(JSON.stringify({
                    success: true,
                    message: `宸叉竻绌烘墍鏈変紭閫塈P锛屽叡鍒犻櫎 ${deletedCount} 涓猔,
                    deletedCount: deletedCount
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 鍗曚釜鍒犻櫎閫昏緫
            if (!body.ip) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'IP鍦板潃鏄繀闇€鐨?,
                    message: '璇锋彁渚涜鍒犻櫎鐨刬p瀛楁锛屾垨浣跨敤 {"all": true} 娓呯┖鎵€鏈?
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const port = body.port || 443;
            
            // 浠巠x鍙橀噺鑾峰彇鐜版湁鍒楄〃
            const yxValue = getConfigValue('yx', '');
            const preferredIPs = parseYxToArray(yxValue);
            const initialLength = preferredIPs.length;
            
            // 鍒犻櫎鍖归厤鐨処P
            const filteredIPs = preferredIPs.filter(item => 
                !(item.ip === body.ip && item.port === port)
            );
            
            if (filteredIPs.length === initialLength) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '浼橀€塈P涓嶅瓨鍦?,
                    message: `${body.ip}:${port} 鏈壘鍒癭
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // 杞崲鍥瀥x鏍煎紡骞朵繚瀛?            const newYxValue = arrayToYx(filteredIPs);
            await setConfigValue('yx', newYxValue);
            
            return new Response(JSON.stringify({
                success: true,
                message: '浼橀€塈P宸插垹闄?,
                deleted: { ip: body.ip, port: port }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: '涓嶆敮鎸佺殑璇锋眰鏂规硶',
                message: '鏀寔鐨勬柟娉? GET, POST, DELETE'
            }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: '澶勭悊璇锋眰澶辫触',
            message: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 瑙ｆ瀽yx鏍煎紡瀛楃涓蹭负鏁扮粍
// 鏍煎紡: IP:绔彛#鑺傜偣鍚嶇О,IP:绔彛#鑺傜偣鍚嶇О
function parseYxToArray(yxValue) {
    if (!yxValue || !yxValue.trim()) return [];
    
    const items = yxValue.split(',').map(item => item.trim()).filter(item => item);
    const result = [];
    
    for (const item of items) {
        // 妫€鏌ユ槸鍚﹀寘鍚妭鐐瑰悕绉?(#)
        let nodeName = '';
        let addressPart = item;
        
        if (item.includes('#')) {
            const parts = item.split('#');
            addressPart = parts[0].trim();
            nodeName = parts[1].trim();
        }
        
        // 瑙ｆ瀽鍦板潃鍜岀鍙?        const { address, port } = parseAddressAndPort(addressPart);
        
        // 濡傛灉娌℃湁璁剧疆鑺傜偣鍚嶇О锛屼娇鐢ㄩ粯璁ゆ牸寮?        if (!nodeName) {
            nodeName = address + (port ? ':' + port : '');
        }
        
        result.push({
            ip: address,
            port: port || 443,
            name: nodeName,
            addedAt: new Date().toISOString()
        });
    }
    
    return result;
}

// 灏嗘暟缁勮浆鎹负yx鏍煎紡瀛楃涓?function arrayToYx(array) {
    if (!array || array.length === 0) return '';
    
    return array.map(item => {
        const port = item.port || 443;
        return `${item.ip}:${port}#${item.name}`;
    }).join(',');
}

// 楠岃瘉鍩熷悕鏍煎紡
function isValidDomain(domain) {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}
